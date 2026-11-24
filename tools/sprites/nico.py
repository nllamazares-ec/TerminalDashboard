"""Nico desde hojas/nico.png (fondo magenta, una animación por fila):
  trofeo (7, sin usar) · juega con el dino (6, sin usar) · derrota (6, sin usar) · dormido leyendo (4) · espera (4) · dino solo (4)
  y hojas/nico_podio.png: festejo (1.º) · el dino se enoja (2.º/3.º) · tropieza con el dino (4.º), 20 cuadros c/u

Uso:  python nico.py hojas/nico.png salida/nico      (también escribe salida/nico_dino.png, la mascota)
"""
import sys, os
from magenta import procesar
from skin import tone

out = sys.argv[2]
procesar(sys.argv[1], out,
    filas=['trofeo', 'dino', 'derrota', 'dormido', 'espera', 'dino_solo'],
    cuadros=[7, 6, 6, 4, 4, 4],
    referencia=('espera', 0),
    igualar={'festejo': 'festejo', 'enojo': 'festejo', 'tropiezo': 'festejo'},
    por_columnas=['dino'],
    extras=[dict(src=os.path.join(os.path.dirname(sys.argv[1]), 'nico_podio.png'),
                 filas=['festejo', 'enojo', 'tropiezo'], cuadros=[19, 20, 20], grilla=['festejo', 'enojo', 'tropiezo'])],
    # un tono de piel más oscuro que en la hoja (3.º de la paleta de tonos)
    transformar=lambda a: tone(a, (252, 172, 100), (226, 134, 70), smin=.30, smax=.80),
    poses={'parado': ('espera', 0), 'festejo': ('festejo', 2, 'solo'), 'sentado': ('dormido', 0)},
    anims={
        'festejo': dict(fila='festejo',  titulo='festeja con el dino', ms=200, pausa=1400, anclaje='talon', bucle='natural', pausaEn=8, mascota=True),
        'enojo':   dict(fila='enojo',    titulo='el dino se enoja por él', ms=200, pausa=1200, anclaje='talon', bucle='natural', pausaEn=5, mascota=True),
        'derrota': dict(fila='tropiezo', titulo='tropieza con el dino', ms=200, pausa=1400, anclaje='talon', bucle='natural', pausaEn=9, mascota=True),
        'espera':  dict(fila='espera',  titulo='espera', ms=600, pausa=600, bucle='natural'),
        'dormido': dict(fila='dormido', titulo='se queda dormido', ms=700, pausa=2400),
    },
    podio={'gana': 'festejo', 'otro': 'enojo', 'ultimo': 'derrota'},
    mascota=('dino_solo', 0, os.path.join(os.path.dirname(out) or '.', 'nico_dino.png')),
    prev='salida/prev_nico.png')
