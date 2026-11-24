#!/bin/sh
# Regenera los sprites de los personajes a partir de las hojas en hojas/.
# Uso (desde esta carpeta):  sh generar.sh            → escribe en salida/
# Requiere Python 3 con pillow, numpy y scipy:  pip install pillow numpy scipy
# Después copiá salida/atlas/<personaje>/ (atlas.png + atlas.json) a avatars/sprites/<personaje>/,
# salida/nico_dino.png a avatars/mascotas/dino.png y subí AVATARES_VERSION en avatars/players.js.
set -e
export ALTO=96          # alto en píxeles reales del personaje parado
mkdir -p salida
python andy.py hojas/andy.png salida/andy
python dante.py hojas/dante.png salida/dante
python fran.py  hojas/fran.png  salida/fran
python nico.py  hojas/nico.png  salida/nico
for p in andy dante fran; do python pixelize.py salida/$p; done
python pixelize.py salida/nico salida/nico_dino.png
for p in andy dante fran nico; do python empaquetar.py salida/$p salida/atlas/$p; done
echo "listo: salida/"
