# Guía para crear o cambiar animaciones de personajes

Instrucciones para una IA (o una persona) que tenga que agregar, cambiar o quitar animaciones de los
personajes del tablero (Andy, Dante, Fran, Nico). Seguí los pasos en orden.

## 0. Reglas que no se negocian

1. **Una animación = una sola acción continua.** Nunca mezclar actividades u objetos en la misma animación
   (si es tomar mate, es toda la secuencia del mate; no mate + piano + guitarra).
2. **En bucle:** el último cuadro tiene que ser igual (o casi) al primero, para que la animación se repita
   sin saltos. Puede durar más, pero debe cerrar.
3. **Cada puesto del podio tiene su sentido:**
   - `gana` (1.º): festejo.
   - `otro` (2.º/3.º): envidia o bronca hacia el ganador, que se le pasa. **Sin medallas ni trofeos.**
   - `ultimo` (4.º): algo le sale mal y **empieza y termina en el piso** (sentado o tirado): se dibuja al
     costado del podio.
4. Fran es el usuario dueño del proyecto: su personaje es el científico loco. Su 2.º/3.º es la
   transformación en Hulk; no cambiarla salvo que lo pida.
5. Cada personaje mantiene su temática: Andy = música y mate, Dante = moto, Nico = su dino,
   Fran = experimentos.

## 1. Dónde se usa cada animación

| Animación | Dónde aparece |
|---|---|
| las 3 de `podio` en el atlas (`gana`, `otro`, `ultimo`) | podio de `index.html`, según el puesto del día |
| `espera` | panel "hoy", al lado de los que ya jugaron |
| `dormido` (+ pose `sentado`) | "faltan:", los que todavía no jugaron |
| todas | el perfil (`perfil.html`) las muestra todas |

Poses fijas (cuadro suelto): `parado`, `caminando` (opcional), `festejo`, `sentado`.

## 2. Pedir la hoja de sprites a la IA de imágenes

Pasarle la imagen de referencia del personaje y un prompt como este (completar los cuadros):

```
Usá la imagen adjunta como referencia exacta del personaje y su estilo pixel art.

Reglas:
- Fondo de un solo color plano #FF00FF (magenta), sin degradés, sin sombras en el piso, sin textos, números ni líneas separadoras.
- N animaciones, cada una en UNA fila horizontal de 20 cuadros, de izquierda a derecha. Bastante espacio de fondo entre filas y entre cuadros (que no se toquen ni se superpongan los efectos).
- Imagen muy ancha (por ejemplo 4000×1600 px) para que cada cuadro tenga buen tamaño.
- El personaje mide unos 96 px de alto parado, siempre a la misma escala en todas las filas.
- Apoyado sobre una superficie plana (el podio o el piso los agrega el juego, NO dibujarlos). Siempre en la misma línea de piso, mirando hacia la derecha.
- Pixel art nítido, sin antialiasing, contorno oscuro de 1-2 px.
- Cada fila es una sola acción continua, sin cortes ni cambio de objeto.
- En cada fila, el cuadro 20 es IGUAL al cuadro 1, para que se repita en bucle.
- Ningún objeto, confeti ni efecto en violeta o rosa (para no confundirse con el fondo).

FILA 1 — <nombre> (<puesto>):
1. ...
20. Igual al cuadro 1.
```

Consejos:
- Si hay vehículo o mascota, aclarar el tamaño conjunto ("moto y personaje juntos unos 96 px de alto y no
  más de 1,6 veces de ancho que de alto") y que sea siempre igual a la referencia.
- Evitar efectos enormes que crucen varios cuadros (fuegos artificiales, confeti en el aire): no se pueden
  separar. El podio ya tira confeti al 1.º.
- La IA a veces dibuja 19 cuadros en vez de 20, o agrega uno de más. No hace falta pedirla de nuevo:
  se ajusta en el paso 4.

## 3. Guardar la hoja

Copiar la imagen a `tools/sprites/hojas/` con un nombre corto, p. ej. `andy_podio.png`. Mirarla antes
de seguir: contar las filas y los cuadros de cada fila, y ver si el último cuadro cierra el bucle.

## 4. Configurar el personaje (`tools/sprites/<personaje>.py`)

Cada personaje llama a `procesar()` de `magenta.py`. Lo importante:

```python
procesar(sys.argv[1], sys.argv[2],
    filas=[...], cuadros=[...],            # filas de la hoja principal (hojas/<personaje>.png)
    referencia=('espera', 0),              # cuadro que define la escala (personaje parado)
    igualar={'fila_nueva': 'fila_base'},   # fila → fila cuyo cuadro 1 (parado) iguala su escala a la referencia
    extras=[dict(src=.../'<personaje>_podio.png',
                 filas=['a', 'b', 'c'], cuadros=[20, 20, 20],
                 grilla=['a', 'b', 'c'],          # separar cuadros por espacios vacíos (recomendado)
                 tapar=[(x0, y0, x1, y1)])],      # opcional: borrar zonas de la hoja (efectos que cruzan cuadros)
    poses={'parado': ('espera', 0), 'festejo': ('a', 10), 'sentado': ('dormido', 0)},
    anims={
        'festejo': dict(fila='a', titulo='...', ms=200, pausa=1400, anclaje='talon',
                        bucle='natural', pausaEn=11),
        ...
    },
    podio={'gana': 'festejo', 'otro': '...', 'ultimo': '...'},
    prev='salida/prev_<personaje>.png')
```

Opciones de cada animación (`anims`):
- `fila`: qué fila de la hoja usa. El nombre de la animación es la clave del dict.
- `ms`: duración de cada cuadro (200 para 20 cuadros). `pausa`: ms extra en el cuadro de pausa.
- `bucle='natural'`: la hoja ya cierra el bucle (lo normal con la regla 2). Sin esto se reproduce ida y vuelta.
- `pausaEn`: índice (desde 0) del cuadro donde se detiene: el clímax (grito, explosión, salto).
- `anclaje`: cómo se alinean los cuadros. `'talon'` (pie de atrás, para personajes que se mueven),
  `'grande'` (la figura más ancha: moto, piano), `'centro'` (por defecto).
- `hasta=N`: usar solo los primeros N cuadros (si el último no cierra el bucle).
- `mascota=True`: la mascota ya está dibujada en los cuadros (el motor no agrega la de `MASCOTAS`).

Escala con `igualar`: si una fila empieza sentada o en el piso, apuntala a una fila de la misma hoja que
empiece parada (p. ej. `'piano': 'guitarra'`); si no, el personaje sale gigante.

Si el número de cuadros de la hoja no es el pedido, poné en `cuadros` el número real (contalo).

## 5. Generar y revisar

```sh
cd tools/sprites
sh generar.sh            # requiere Python 3 con pillow, numpy y scipy
```

Abrir `salida/prev_<personaje>.png` (una fila por animación) y revisar:
- Que cada cuadro tenga un solo personaje entero (no dos pegados, ni uno partido, ni cuadros vacíos).
  Si falla: probá `grilla`, corregí `cuadros`, o `tapar` el efecto que une cuadros.
- Que todos tengan el mismo tamaño que las otras animaciones (si no, corregí `igualar`).
- Que el primer y el último cuadro coincidan.
- Que `pausaEn` caiga en el clímax.

## 6. Instalar

```sh
for p in andy dante fran nico; do cp salida/atlas/$p/atlas.png salida/atlas/$p/atlas.json ../../avatars/sprites/$p/; done
cp salida/nico_dino.png ../../avatars/mascotas/dino.png
```

Después, para que los navegadores no muestren lo viejo:
- Subir `window.AVATARES_VERSION` en `avatars/players.js` (+1).
- Si cambió algún `.js`, subir también el `?v=` de los `<script>` en `index.html` y `perfil.html`.

Si se renombró o quitó una animación, buscar su nombre en `index.html`, `perfil.html` y `avatars/*.js`
(`espera` y `dormido` se usan por nombre en `index.html`).

## 7. Probar

Levantar un servidor estático en la raíz del proyecto (p. ej. `python -m http.server 8000`), abrir
`http://localhost:8000` y recargar con Ctrl+F5. Mirar el podio y el perfil de cada personaje que se tocó.

## 8. Commit y PR

- Commitear juntos: la hoja nueva (`tools/sprites/hojas/`), el `.py` del personaje, los atlas de
  `avatars/sprites/`, `players.js` y lo que se haya tocado.
- Mensaje en español, con prefijo `feat:` o `fix:`.
- El repo original (`nllamazares-ec/TerminalDashboard`) no acepta push directo: se pushea la rama al fork
  (`fork` → `frandiaz99/TerminalDashboard`) y se abre un pull request hacia `main`.
