"""Andy desde hojas/andy.png (espera, dormido y poses) y hojas/andy_podio.png (las 3 del podio, 20 cuadros c/u):
  andy.png:       trofeo (7) · teclado (6) · derrota (6) · dormido con el mate (4) · espera (4) · mate (8)
  andy_podio.png: guitarra (1.º) · mate (2.º/3.º) · piano (4.º)

Uso:  python andy.py hojas/andy.png salida/andy
"""
import sys, os
from magenta import procesar

procesar(sys.argv[1], sys.argv[2],
    filas=['trofeo', 'teclado', 'derrota', 'dormido', 'espera', 'mate'],
    cuadros=[7, 6, 6, 4, 4, 8],
    referencia=('espera', 0),
    igualar={'guitarra': 'guitarra', 'mate_podio': 'guitarra', 'piano': 'guitarra'},
    extras=[dict(src=os.path.join(os.path.dirname(sys.argv[1]), 'andy_podio.png'),
                 filas=['guitarra', 'mate_podio', 'piano'], cuadros=[19, 19, 20], grilla=['guitarra', 'mate_podio', 'piano'])],
    poses={'parado': ('espera', 0), 'festejo': ('guitarra', 15), 'sentado': ('dormido', 0)},
    anims={
        'festejo': dict(fila='guitarra',   titulo='festeja como héroe del rock', ms=200, pausa=1400, anclaje='talon', bucle='natural', pausaEn=12),
        'mate':    dict(fila='mate_podio', titulo='se consuela con un mate', ms=200, pausa=1400, anclaje='talon', bucle='natural', pausaEn=14),
        'piano':   dict(fila='piano',      titulo='se le cierra la tapa del piano', ms=200, pausa=1400, anclaje='grande', bucle='natural', pausaEn=8),
        'espera':  dict(fila='espera',  titulo='espera', ms=600, pausa=600, bucle='natural'),
        'dormido': dict(fila='dormido', titulo='se queda dormido', ms=700, pausa=2400),
    },
    podio={'gana': 'festejo', 'otro': 'mate', 'ultimo': 'piano'},
    prev='salida/prev_andy.png')
