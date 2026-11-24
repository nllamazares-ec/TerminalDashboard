"""Fran científico loco desde hojas/fran.png (fondo magenta, una animación por fila):
  espera (4) · invento (7) · mezcla (6) · explosión (6) · caminar (8) · dormido (4)

Uso:  python fran.py hojas/fran.png salida/fran
"""
import sys
from magenta import procesar

procesar(sys.argv[1], sys.argv[2],
    filas=['espera', 'invento', 'mezcla', 'explosion', 'caminar', 'dormido'],
    cuadros=[4, 7, 6, 6, 8, 4],
    referencia=('espera', 0),
    igualar=['caminar'],
    poses={'parado': ('espera', 0), 'caminando': ('caminar', 2), 'festejo': ('invento', 5), 'sentado': ('dormido', 0)},
    anims={
        'invento':   dict(fila='invento',   titulo='su invento funciona', ms=330, pausa=1400),
        'mezcla':    dict(fila='mezcla',    titulo='mezcla dos frascos', ms=380, pausa=1200),
        'explosion': dict(fila='explosion', titulo='le explota el experimento', ms=420, pausa=2000),
    },
    podio={'gana': 'invento', 'otro': 'mezcla', 'ultimo': 'explosion'},
    prev='salida/prev_fran.png')
