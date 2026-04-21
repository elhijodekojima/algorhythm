# 🎮 Game Design Document — Algorhythm
> Versión 1.0 · 2026-04-21 · Fuente: `Documento de Diseño de Juego (GDD) - Algorhythm.txt`

---

## 1. Visión General

| Campo | Valor |
|-------|-------|
| **Nombre** | Algorhythm |
| **Género** | Juego de ritmo musical 3D |
| **Plataforma** | Web (navegador de escritorio) — Vercel |
| **Pitch** | "Un simulador de piano arcade donde el jugador usa su teclado QWERTY para tocar canciones generadas por IA, cuyas notas caen en un entorno 3D relajante." |

---

## 2. Bucle de Jugabilidad (Core Loop)

1. **Selección** — El jugador elige una pista en el menú "Start Session".
2. **Ejecución** — Las notas caen en 10 carriles 3D. El jugador presiona las teclas correspondientes cuando cruzan la **Hit Line**.
3. **Feedback** — Respuesta visual y auditiva inmediata (acierto, fallo, puntuación).
4. **Resolución** — Pantalla de resultados con % de precisión y puntuación total.

---

## 3. Mecánicas y Controles

### 3.1 Mapeo de Teclas

> **10 teclas activas**, de izquierda (grave) a derecha (agudo):

| Posición | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|----------|---|---|---|---|---|---|---|---|---|---|
| **Tecla** | Q | W | E | R | V | B | U | I | O | P |
| **Mano** | ✋ Izq | ✋ Izq | ✋ Izq | ✋ Izq | ✋ Izq | 🤚 Der | 🤚 Der | 🤚 Der | 🤚 Der | 🤚 Der |
| **Rango** | Grave | ← | ← | ← | ← | → | → | → | → | Agudo |

Q = nota más grave · P = nota más aguda

### 3.2 Sistema de Notas (Chart)

- **Formato de entrada**: JSON o MIDI parseado.
- **Scroll Speed**: Aparejada al BPM. Las notas aparecen **~3 segundos antes** de ser tocadas.

#### Tipos de Notas

| Tipo | Descripción | Puntuación |
|------|-------------|-----------|
| **Nota simple** | 1 tecla, 1 sonido | +50 pts |
| **Acorde** | 2+ notas simultáneas. Si falla 1 input del acorde, falla todo | +50 × nº notas |
| **Nota sostenida** | Mantener la tecla mientras dura. Soltar antes = deja de puntuar (no miss) | +4 pts/frame |
| **Acorde sostenido** | Combinación de acorde + sostenida | Ídem |

### 3.3 Sistema de Puntuación

- Acierto: **+50 puntos** (no se penaliza el fallo en puntuación).
- Nota sostenida: **+4 puntos/frame** mientras se mantiene.
- **Combo multiplicador**:

| Aciertos seguidos | Multiplicador |
|-------------------|---------------|
| 0–9 | ×1 |
| 10–19 | ×2 |
| 20–29 | ×3 |
| 30+ | ×4 (máximo) |

### 3.4 Sistema de Éxito / Fracaso (Barra de Vida)

- La barra empieza en **50%**.
- Rango: 0% (Game Over) — 100% (máximo).
- Los cambios dependen de la **dificultad** (ver 3.5).
- **Representación**: Barra vertical luminosa a un lado del carril.

| Rango | Color |
|-------|-------|
| > 66% | 🟢 Verde |
| 33–66% | 🔵 Azul |
| < 33% | 🔴 Rojo parpadeante |

#### Tipos de Miss (Fallo)

1. **Input extra** — Tecla pulsada sin nota en la Hit Line → miss + sonido de nota distorsionada.
2. **Input omitido** — Nota pasa la Hit Line sin ser tocada → miss + volumen del MP3 se atenúa brevemente.

### 3.5 Sistema de Dificultad

| Dificultad | Teclas activas | Scroll Speed | Vida (acierto) | Vida (fallo) |
|------------|----------------|-------------|----------------|--------------|
| **Fácil** | Q, W, E, I, O, P | Lenta | +2% | −0.5% |
| **Medio** | Q, W, E, R, U, I, O, P | Media | +1% | −1% |
| **Experto** | Q, W, E, R, V, B, U, I, O, P | Rápida (BPM-sync) | +1% | −2% |

> Los charts de Fácil y Medio son versiones reducidas/simplificadas del chart Experto.

### 3.6 Barra de Progreso

- Va del 0% (inicio de canción) al 100% (final).
- Si hay Game Over, se muestra en qué % de la canción ocurrió.

---

## 4. Pipeline de Audio

- **Formato**: MP3/OGG pre-renderizados como assets.
- **Sincronización**: `AudioContext.currentTime` es la única fuente de verdad para la posición Z de las notas. (ADR-004).
- **Offset manual**: El jugador puede corregir el desfase desde el menú de Opciones. Si se modifica durante pausa, la canción se reinicia con el nuevo valor.

---

## 5. Estética y Renderizado (Three.js)

- **Estilo**: Esotérico-futurista con luces de neón (ver `STYLE_LOCK.md`).
- **Cámara**: Perspectiva 3D mirando hacia un teclado virtual en la parte inferior; las notas vienen desde el horizonte (Z negativo) hacia la cámara.
- **Feedback visual**:
  - Acierto: destello en la tecla + partículas saltando.
  - Fallo: la nota se desvanece en rojo.

---

## 6. Arquitectura de UI

### Pantallas requeridas

#### 6.1 Menú Principal (Main Menu)
- Esquina superior derecha: botones **"Start Session"** y **"Options"**.

#### 6.2 Options
- Barra deslizable de **volumen** (0–100%, default 100%) con tic sonoro de feedback.
- Ajuste manual de **offset** de audio (en ms).

#### 6.3 Start Session (Selector de Canciones)
- Listado vertical de hasta **6 canciones** con formato:
  ```
  Session #X
  [Título de la canción]
  ```
- Solo la primera canción desbloqueada al inicio.
- **Desbloqueo progresivo**: superar la canción anterior en cualquier dificultad.
- Canciones bloqueadas muestran la condición de desbloqueo.
- Al seleccionar canción → el listado desaparece y aparece el **selector de dificultad** (Fácil / Medio / Experto).

#### 6.4 HUD en Juego
- Puntuación actual
- Combo (multiplicador activo)
- Barra de progreso de canción
- Barra de vida (vertical, lateral)

#### 6.5 Menú de Pausa
Opciones:
- Reintentar
- Salir al Main Menu
- Salir al selector de canciones
- Acceso a Options (si se modifica el offset → avisar que la canción se reiniciará)

#### 6.6 Pantalla de Resultados

**Si supera la canción:**

| Métrica | Sistema de Estrellas |
|---------|----------------------|
| 100% de precisión | ⭐⭐⭐⭐⭐⭐ (6 estrellas) |
| 90–99.99% | ⭐⭐⭐⭐⭐ (5 estrellas) |
| 80–89.99% | ⭐⭐⭐⭐ (4 estrellas) |
| < 80% | ⭐⭐⭐ (3 estrellas) |

Opciones: Reintentar · Main Menu · Elegir otra canción.

**Si fracasa (Game Over):**
> "You failed [nombre] at [X%]"

Mismas opciones de navegación.

---

## 7. MVP — Producto Mínimo Viable

Funcionalidades a implementar en la primera iteración funcional completa:

- [ ] Escenario vacío en Three.js con cámara e iluminación base
- [ ] Carril de notas funcional (cubos 3D desplazándose hacia la cámara)
- [ ] Lectura de un chart de prueba (array hardcodeado o JSON simple)
- [ ] Detección de input del teclado sincronizado con las notas
- [ ] Reproducción de audio sincronizada con el movimiento visual

---

## 8. Miscelánea — Song-Test (Canción de Prueba Temporal)

> Creada por Antigravity para testear el game feel. Se eliminará cuando el proyecto avance.

**Requisitos:**
- Generada programáticamente (síntesis web o samples inline — sin archivos externos grandes).
- Accesible directamente desde el Main Menu (botón "Play Test Song").
- Fácil de jugar — muestra todos los tipos de notas: simples, acordes, sostenidas, acordes sostenidos.
- Duración: ~60–90 segundos.
