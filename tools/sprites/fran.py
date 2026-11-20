"""Fran científico loco desde hojas/fran.png (fondo magenta, una animación por fila):
  espera (4) · invento (7) · mezcla (6) · explosión (6) · caminar (8) · dormido (4)
  y hojas/fran_podio.png: el invento funciona (1.º) · le explota el experimento (4.º), 20 cuadros c/u

Uso:  python fran.py hojas/fran.png salida/fran
"""
import sys, os
from magenta import procesar

procesar(sys.argv[1], sys.argv[2],
    filas=['espera', 'invento', 'mezcla', 'explosion', 'caminar', 'dormido'],
    cuadros=[4, 7, 6, 6, 8, 4],
    referencia=('espera', 0),
    igualar={'caminar': 'caminar', 'hulk': 'hulk', 'exito': 'exito', 'explota': 'exito'},
    sin_tinte=['hulk'],
    extras=[dict(src=os.path.join(os.path.dirname(sys.argv[1]), 'fran_hulk.png'), filas=['hulk'], cuadros=[20], por_columnas=['hulk']),
            dict(src=os.path.join(os.path.dirname(sys.argv[1]), 'fran_podio.png'), filas=['exito', 'explota'], cuadros=[19, 19], grilla=['exito', 'explota'],
                 tapar=[(0, 0, 2172, 128)])],   # fuegos artificiales y confeti (el confeti ya lo pone el podio)
    poses={'parado': ('espera', 0), 'caminando': ('caminar', 2), 'festejo': ('exito', 10), 'sentado': ('dormido', 0)},
    anims={
        'invento':   dict(fila='exito',     titulo='su invento funciona', ms=200, pausa=1400, anclaje='talon', bucle='natural', pausaEn=9),
        'hulk':      dict(fila='hulk',      titulo='se toma la mezcla y se vuelve Hulk', ms=200, pausa=1500, anclaje='talon', bucle='natural', pausaEn=13),
        # el último cuadro de la hoja (parado) no cierra el bucle: se usan los 18 primeros
        'explosion': dict(fila='explota',   titulo='le explota el experimento', ms=200, pausa=1400, anclaje='talon', bucle='natural', pausaEn=9, hasta=18),
        'espera':  dict(fila='espera',  titulo='espera', ms=600, pausa=600, bucle='natural'),
        'dormido': dict(fila='dormido', titulo='se queda dormido', ms=700, pausa=2400),
    },
    podio={'gana': 'invento', 'otro': 'hulk', 'ultimo': 'explosion'},
    prev='salida/prev_fran.png')
