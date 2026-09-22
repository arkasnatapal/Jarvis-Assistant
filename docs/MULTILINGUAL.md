# Multilingual Support Specification

## Supported Languages
- **`en`**: English
- **`hi`**: Hindi (हिन्दी)
- **`bn`**: Bengali (বাংলা)
- **`hinglish`**: Hinglish (Hindi written in Latin script)
- **`banglish`**: Banglish (Bengali written in Latin script)

## Detection Engine
Language identification is handled by `LanguageDetector`:
1. **Script Range Matching**: Detects Devanagari (`\u0900-\u097F`) for Hindi and Bengali Script (`\u0980-\u09FF`) for Bengali.
2. **Heuristic Keyword Analysis**: Scans Latin script text for high-frequency Hinglish (`aaj`, `mera`, `kaise`, `kya`) and Banglish (`aamhar`, `kaaj`, `ache`, `kemon`) vocabulary.
3. **Orchestrator Integration**: Emits `voice.language.detected` event with confidence scores and instructs LLM to respond in the user's input language.
