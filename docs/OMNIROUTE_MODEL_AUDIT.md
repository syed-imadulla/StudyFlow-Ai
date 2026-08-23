# OmniRoute Model Audit

| Model | HTTP | Latency | JSON | Tools | Result |
|------|------|---------|------|-------|--------|
| gemini/gemini-3.6-flash | timeout | >15s | FAIL | UNKNOWN | REJECT |
| gemini/gemini-3.7-flash | 429 | 4.7s | FAIL | UNKNOWN | REJECT |
| tllm/gemini_1_5_flash | 403 | 3.2s | FAIL | UNKNOWN | REJECT |
| tllm/gemini_2_0_flash | 403 | 0.2s | FAIL | UNKNOWN | REJECT |
| aug/gemini-3.1-pro-preview | 502 | 0.1s | FAIL | UNKNOWN | REJECT |
| gemini/gemini-flash-latest | timeout | >15s | FAIL | UNKNOWN | REJECT |
| gemini/gemini-2.5-flash | 429 | 0.0s | FAIL | UNKNOWN | REJECT |
| auto | 200 | 2.9s | PASS | PASS | USE |
| groq/whisper-large-v3 | 400 | 0.1s | FAIL | UNKNOWN | REJECT |

## Final Verification for `auto`
- **Tool Call Detected**: PASS
- **Valid Function Name**: PASS (`get_weather`)
- **Valid Arguments**: PASS (`{"location": "Paris"}`)
- **Tool Result Accepted**: PASS
- **Total Latency**: 18.3s
- **Final Response**: `The current weather in Paris is **sunny** with a temperature of **20Â°C**.`
