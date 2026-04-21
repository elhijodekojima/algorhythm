# algorhythm
Un juego de ritmo estilo Guitar Hero para teclado QWERTY. Música generada por IA, pianos extraídos/transcritos automáticamente a MIDI y motor desarrollado puramente mediante vibe coding. 🎹🤖
🎹 Algorhythm
El juego de ritmo donde la Inteligencia Artificial compone, transcribe y (casi) programa.

VibeKeys es un experimento de desarrollo de videojuegos moderno. Nace de la idea de fusionar la generación musical por IA con el concepto de vibe coding (programación fluida asistida por IA) para crear una experiencia arcade directamente en tu teclado.

🚀 El Concepto (AI Pipeline)
Este juego no usa assets tradicionales. Todo el contenido musical sigue un flujo de trabajo impulsado por IA:

Generación: Creación de las pistas musicales completas utilizando modelos como Suno o Udio.

Separación (Stem Isolation): Extracción de la pista de piano aislada del resto de la mezcla mediante modelos de separación de audio (ej. Demucs).

Transcripción (Audio-to-MIDI): Conversión del audio del piano aislado a un "chart" jugable (archivo MIDI/JSON) usando herramientas de transcripción automática (ej. Spotify Basic Pitch).

Desarrollo (Vibe Coding): Motor de juego construido fluyendo con asistentes de código (Antigravity).

🎮 Características Principales
QWERTY como Piano: Transforma las teclas de tu ordenador en un instrumento musical.

Sistema de "Charts" Automático: El juego lee la música y las marcas de tiempo generadas por la IA para hacer caer las notas con precisión.

100% IA-Powered: Desde la banda sonora hasta el código base.

🛠️ Stack Tecnológico
Música: Suno / Udio

Extracción de Audio: Demucs / LALAL.AI

Transcripción MIDI: Basic Pitch / AnthemScore

Motor del Juego: [Lenguaje/Motor que vayas a usar]

Asistente de Código: Antigravity / Cursor
