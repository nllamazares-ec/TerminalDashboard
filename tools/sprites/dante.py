"""Dante desde hojas/dante.png (espera, dormido y poses) y hojas/dante_podio.png (las 3 del podio, 20 cuadros c/u):
  dante.png:       espera (4) · trofeo (7) · moto (8) · derrota (6) · dormido en el casco (4) · caminar (8)
  dante_podio.png: trompo (1.º) · moto rugiendo (2.º/3.º) · se le planta la moto (4.º)

Uso:  python dante.py hojas/dante.png salida/dante
"""
import sys, os
from magenta import procesar

procesar(sys.argv[1], sys.argv[2],
    filas=['espera', 'trofeo', 'moto_vieja', 'derrota_vieja', 'dormido', 'caminar'],
    cuadros=[4, 7, 8, 6, 4, 8],
    referencia=('espera', 0),
    igualar={'caminar': 'caminar', 'trompo': 'trompo', 'ruge': 'trompo', 'plantada': 'trompo'},
    extras=[dict(src=os.path.join(os.path.dirname(sys.argv[1]), 'dante_podio.png'),
                 filas=['trompo', 'ruge', 'plantada'], cuadros=[20, 20, 20], grilla=['trompo', 'ruge', 'plantada'])],
    por_columnas=['moto_vieja', 'derrota_vieja'],
    sin_tinte=True,
    poses={'parado': ('espera', 0), 'caminando': ('caminar', 2), 'festejo': ('trompo', 10), 'sentado': ('dormido', 0)},
    anims={
        'festejo': dict(fila='trompo',   titulo='festeja con un trompo en la moto', ms=200, pausa=1400, anclaje='grande', bucle='natural', pausaEn=11),
        'moto':    dict(fila='ruge',     titulo='hace rugir la moto de bronca', ms=200, pausa=1200, anclaje='grande', bucle='natural', pausaEn=9),
        'derrota': dict(fila='plantada', titulo='se le planta la moto', ms=200, pausa=1600, anclaje='grande', bucle='natural', pausaEn=13),
        'espera':  dict(fila='espera',  titulo='espera', ms=600, pausa=600, bucle='natural'),
        'dormido': dict(fila='dormido', titulo='se queda dormido', ms=700, pausa=2400),
    },
    podio={'gana': 'festejo', 'otro': 'moto', 'ultimo': 'derrota'},
    prev='salida/prev_dante.png')
