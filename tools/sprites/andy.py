"""Andy desde hojas/andy.png (fondo magenta, una animación por fila):
  trofeo (7) · teclado (6) · derrota (6) · dormido con el mate (4) · espera (4) · mate (8)

Uso:  python andy.py hojas/andy.png salida/andy
"""
import sys, os
from magenta import procesar

procesar(sys.argv[1], sys.argv[2],
    filas=['trofeo', 'teclado', 'derrota', 'dormido', 'espera', 'mate'],
    cuadros=[7, 6, 6, 4, 4, 8],
    referencia=('espera', 0),
    igualar={'trofeo': 'trofeo', 'derrota': 'derrota', 'mate': 'mate', 'festejo': 'festejo', 'festejo_pose': 'festejo'},
    extras=[dict(src=os.path.join(os.path.dirname(sys.argv[1]), 'andy_festejo.png'), filas=['festejo', 'festejo_pose'], cuadros=[7, 1])],
    poses={'parado': ('espera', 0), 'festejo': ('festejo_pose', 0), 'sentado': ('dormido', 0)},
    anims={
        'festejo': dict(fila='festejo', titulo='festeja con un solo de guitarra', ms=380, pausa=1600, anclaje='talon'),
        'teclado': dict(fila='teclado', titulo='toca el teclado', ms=380, pausa=900),
        'derrota': dict(fila='derrota', titulo='queda tirado en el piso', ms=450, pausa=2000, anclaje='talon'),
    },
    podio={'gana': 'festejo', 'otro': 'teclado', 'ultimo': 'derrota'},
    prev='salida/prev_andy.png')
