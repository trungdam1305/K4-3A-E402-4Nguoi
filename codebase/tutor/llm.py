"""Gọi LLM qua REST (không cần SDK): OpenAI, DeepSeek (hoặc cổng tương thích OpenAI) và Gemini,
thử lần lượt theo chuỗi model.

Key chỉ đọc từ biến môi trường / codebase/.env, không log key. Model nào báo 429 (hết hạn mức)
bị tạm bỏ qua 1 giờ và client chuyển sang model kế tiếp trong chuỗi. JSON trả về luôn được kiểm
theo schema bằng code; sai schema thì chuyển model kế tiếp.
"""
import json
import os
import re
import time
import urllib.error
import urllib.request

from .config import (DEFAULT_DEEPSEEK_FALLBACK_MODELS, DEFAULT_DEEPSEEK_MODEL, DEFAULT_FALLBACK_MODELS,
                     DEFAULT_MODEL, DEFAULT_OPENAI_FALLBACK_MODELS, DEFAULT_OPENAI_MODEL, DEFAULT_PROVIDERS)

EXHAUSTED_COOLDOWN_S = 3600
# Một số cổng API (sau Cloudflare) chặn User-Agent mặc định của urllib (lỗi 1010).
USER_AGENT = "VLearnTutor/0.2"


class LLMError(RuntimeError):
    pass


class HTTPFailure(Exception):
    def __init__(self, code: int, detail: str):
        super().__init__(f"HTTP {code}")
        self.code, self.detail = code, detail


def _post_json(url: str, body: dict, headers: dict, timeout: float) -> dict:
    req = urllib.request.Request(url, data=json.dumps(body).encode("utf-8"),
                                 headers={"Content-Type": "application/json", "User-Agent": USER_AGENT, **headers})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        raise HTTPFailure(e.code, e.read().decode("utf-8", errors="replace")) from None


def _error_message(detail: str) -> str:
    try:
        return json.loads(detail)["error"]["message"].splitlines()[0][:160]
    except (ValueError, KeyError, TypeError, AttributeError, IndexError):
        return detail[:160]


def schema_problems(value, schema: dict, path: str = "$") -> list:
    """Kiểm JSON theo schema kiểu Gemini (type viết hoa, enum, required). Trả danh sách lỗi."""
    t = schema["type"].upper()
    kinds = {"OBJECT": dict, "ARRAY": list, "STRING": str, "BOOLEAN": bool}
    if t in ("NUMBER", "INTEGER"):
        ok = isinstance(value, (int, float)) and not isinstance(value, bool)
    else:
        ok = isinstance(value, kinds.get(t, object))
    if not ok:
        return [f"{path} phải là {t.lower()}"]
    problems = []
    if "enum" in schema and value not in schema["enum"]:
        problems.append(f"{path}={str(value)[:30]!r} không thuộc {schema['enum']}")
    if t == "OBJECT":
        # Khoá bắt buộc chỉ kiểm ở cấp ngoài cùng; mục con thiếu trường (vd. một câu trích) agent tự bỏ qua.
        for key in schema.get("required", []) if path == "$" else []:
            if key not in value:
                problems.append(f"thiếu {path}.{key}")
        for key, sub in schema.get("properties", {}).items():
            if key in value and value[key] is not None:
                problems += schema_problems(value[key], sub, f"{path}.{key}")
    elif t == "ARRAY":
        for i, item in enumerate(value):
            problems += schema_problems(item, schema["items"], f"{path}[{i}]")
    return problems


def _models_from_env(model_var, fallback_var, default_model, default_fallbacks):
    primary = os.environ.get(model_var, default_model)
    fallbacks = os.environ.get(fallback_var, ",".join(default_fallbacks))
    return [primary] + [m.strip() for m in fallbacks.split(",") if m.strip() and m.strip() != primary]


# ---------------------------------------------------------------- nhà cung cấp


class GeminiProvider:
    name = "gemini"
    url = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

    def __init__(self, api_key: str, models: list[str], timeout: float = 60):
        self.api_key, self.models, self.timeout = api_key, models, timeout
        self.thinking = os.environ.get("GEMINI_THINKING", "low")  # "" để tắt thinkingConfig

    @classmethod
    def from_env(cls):
        key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
        if key:
            return cls(key, _models_from_env("GEMINI_MODEL", "GEMINI_FALLBACK_MODELS",
                                             DEFAULT_MODEL, DEFAULT_FALLBACK_MODELS))

    def call(self, model: str, system: str, prompt: str, schema: dict) -> tuple[str, dict]:
        config = {"responseMimeType": "application/json", "responseSchema": schema}
        if os.environ.get("GEMINI_TEMPERATURE"):
            config["temperature"] = float(os.environ["GEMINI_TEMPERATURE"])
        if self.thinking:
            config["thinkingConfig"] = {"thinkingLevel": self.thinking}
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": config,
        }
        headers = {"x-goog-api-key": self.api_key}
        try:
            data = _post_json(self.url.format(model=model), body, headers, self.timeout)
        except HTTPFailure as e:
            if e.code == 400 and "thinking" in e.detail.lower():
                config.pop("thinkingConfig", None)  # model đời cũ không nhận thinkingLevel
                data = _post_json(self.url.format(model=model), body, headers, self.timeout)
            else:
                raise
        cands = data.get("candidates") or []
        if not cands:
            raise LLMError(f"{model} không trả kết quả: {json.dumps(data.get('promptFeedback', {}))[:200]}")
        parts = cands[0].get("content", {}).get("parts", [])
        usage = data.get("usageMetadata", {})
        return "".join(p.get("text", "") for p in parts if not p.get("thought")), {
            "model": data.get("modelVersion", model),
            "prompt_tokens": usage.get("promptTokenCount"),
            "output_tokens": usage.get("candidatesTokenCount"),
            "finish_reason": cands[0].get("finishReason"),
        }


def _openai_schema(s: dict) -> dict:
    """Schema kiểu Gemini (type viết hoa) → JSON Schema strict của OpenAI."""
    t = s["type"].lower()
    out = {"type": t}
    for k in ("enum", "description"):
        if k in s:
            out[k] = s[k]
    if t == "object":
        props = {k: _openai_schema(v) for k, v in s["properties"].items()}
        out.update(properties=props, required=list(props), additionalProperties=False)
    elif t == "array":
        out["items"] = _openai_schema(s["items"])
    return out


class OpenAIProvider:
    name = "openai"

    def __init__(self, api_key: str, models: list[str], base_url: str, timeout: float = 60):
        self.api_key, self.models, self.timeout = api_key, models, timeout
        self.url = base_url.rstrip("/") + "/chat/completions"

    @classmethod
    def from_env(cls):
        key = os.environ.get("OPENAI_API_KEY")
        if key:
            models = _models_from_env("OPENAI_MODEL", "OPENAI_FALLBACK_MODELS",
                                      DEFAULT_OPENAI_MODEL, DEFAULT_OPENAI_FALLBACK_MODELS)
            return cls(key, models, os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"))

    def _body(self, model: str, system: str, prompt: str, schema: dict) -> dict:
        body = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "response_format": {"type": "json_schema", "json_schema": {
                "name": "tutor_reply", "strict": True, "schema": _openai_schema(schema)}},
            "max_completion_tokens": 2000,
        }
        if model.startswith(("gpt-5", "o1", "o3", "o4")):
            body["reasoning_effort"] = "low"  # model suy luận không nhận temperature
        else:
            body["temperature"] = 0.2
        return body

    def call(self, model: str, system: str, prompt: str, schema: dict) -> tuple[str, dict]:
        body = self._body(model, system, prompt, schema)
        data = _post_json(self.url, body, {"Authorization": f"Bearer {self.api_key}"}, self.timeout)
        choice = (data.get("choices") or [{}])[0]
        message = choice.get("message", {})
        if message.get("refusal"):
            raise LLMError(f"{model} từ chối: {message['refusal'][:160]}")
        if choice.get("finish_reason") == "length":
            raise LLMError(f"{model} trả lời bị cắt giữa chừng (hết max_completion_tokens)")
        usage = data.get("usage", {})
        return message.get("content") or "", {
            "model": data.get("model", model),
            "prompt_tokens": usage.get("prompt_tokens"),
            "output_tokens": usage.get("completion_tokens"),
            "finish_reason": choice.get("finish_reason"),
        }


class DeepSeekProvider(OpenAIProvider):
    """DeepSeek hoặc cổng tương thích OpenAI không ép được JSON Schema: dùng json_object,
    đưa schema vào system prompt, và để LLMClient kiểm lại bằng code."""
    name = "deepseek"

    @classmethod
    def from_env(cls):
        key = os.environ.get("DEEPSEEK_API_KEY")
        if key:
            models = _models_from_env("DEEPSEEK_MODEL", "DEEPSEEK_FALLBACK_MODELS",
                                      DEFAULT_DEEPSEEK_MODEL, DEFAULT_DEEPSEEK_FALLBACK_MODELS)
            return cls(key, models, os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1"))

    def _body(self, model: str, system: str, prompt: str, schema: dict) -> dict:
        spec = json.dumps(_openai_schema(schema), ensure_ascii=False)
        system = (f"{system}\n\nĐỊNH DẠNG TRẢ LỜI: chỉ trả về MỘT JSON object hợp lệ (json), không kèm chữ nào khác, "
                  f"đúng JSON Schema sau — mọi khoá đều phải có, giá trị enum phải chép đúng:\n{spec}")
        return {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "max_tokens": 2000,
            "temperature": 0.2,
        }

    def call(self, model: str, system: str, prompt: str, schema: dict) -> tuple[str, dict]:
        text, meta = super().call(model, system, prompt, schema)
        # Một số cổng vẫn bọc JSON trong ```json … ``` hoặc viết thêm sau object dù đã yêu cầu json_object:
        # chỉ lấy object JSON đầu tiên.
        fenced = re.fullmatch(r"\s*```(?:json)?\s*(.*?)\s*```\s*", text, re.S)
        text = (fenced.group(1) if fenced else text).strip()
        try:
            obj, _ = json.JSONDecoder().raw_decode(text)
            text = json.dumps(obj, ensure_ascii=False)
        except ValueError:
            pass  # để LLMClient báo "JSON hỏng" và chuyển model
        return text, meta


PROVIDERS = {"deepseek": DeepSeekProvider, "openai": OpenAIProvider, "gemini": GeminiProvider}


# ---------------------------------------------------------------- chuỗi model


class LLMClient:
    def __init__(self, providers: list, timeout: float = 60):
        self.routes = [(p, m) for p in providers for m in p.models]
        self.exhausted = {}  # (provider, model) → thời điểm bị 429

    @classmethod
    def from_env(cls):
        order = os.environ.get("LLM_PROVIDERS", ",".join(DEFAULT_PROVIDERS))
        providers = []
        for name in (n.strip().lower() for n in order.split(",")):
            factory = PROVIDERS.get(name)
            provider = factory.from_env() if factory else None
            if provider:
                providers.append(provider)
        return cls(providers) if providers else None

    @property
    def models(self):
        return [m for _, m in self.routes]

    @property
    def model(self):
        return self.routes[0][1]

    def _call_route(self, provider, model, system, prompt, schema):
        """Lỗi tạm thời thử lại 1 lần; hết hạn mức (429) thì báo ngay để chuyển model."""
        for attempt in range(2):
            try:
                return provider.call(model, system, prompt, schema)
            except HTTPFailure as e:
                if e.code == 429:
                    self.exhausted[(provider.name, model)] = time.time()
                    raise LLMError(f"{model} hết hạn mức gọi (429: {_error_message(e.detail)[:80]})") from None
                if e.code in (500, 502, 503, 504) and attempt == 0:
                    time.sleep(1.5)
                    continue
                raise LLMError(f"{model} lỗi HTTP {e.code}: {_error_message(e.detail)}") from None
            except (urllib.error.URLError, TimeoutError) as e:
                if attempt == 0:
                    continue
                raise LLMError(f"Lỗi mạng khi gọi {model}: {e}") from None
        raise LLMError(f"Không gọi được {model}")

    def generate_json(self, system: str, prompt: str, schema: dict) -> tuple[dict, dict]:
        started, now = time.perf_counter(), time.time()
        routes = [(p, m) for p, m in self.routes
                  if now - self.exhausted.get((p.name, m), 0) > EXHAUSTED_COOLDOWN_S]
        if not routes:
            raise LLMError("Mọi model đã cấu hình đều hết hạn mức — thử lại sau hoặc dùng key khác")
        errors = []
        for provider, model in routes:
            try:
                text, meta = self._call_route(provider, model, system, prompt, schema)
                result = json.loads(text)
            except LLMError as e:
                errors.append(str(e))
                continue
            except json.JSONDecodeError:
                errors.append(f"{model} trả JSON hỏng: {text[:120]}")
                continue
            problems = schema_problems(result, schema)
            if problems:
                errors.append(f"{model} trả JSON sai schema: {'; '.join(problems[:3])}")
                continue
            meta.update(provider=provider.name, fallback_errors=errors,
                        llm_ms=round((time.perf_counter() - started) * 1000))
            return result, meta
        raise LLMError(" · ".join(errors))
