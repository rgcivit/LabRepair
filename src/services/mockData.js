export const initialWorkOrders = [
  {
    id: "OT-001",
    equipmentName: "Criolipólisis IceSculpt 360",
    equipmentType: "Criolipólisis",
    brand: "Meditech",
    model: "IceSculpt 360",
    serialNumber: "CRIO-77821-X",
    clientName: "Estética Bella Express",
    clientPhone: "+54 11 9876-5432",
    entryDate: "2026-08-01",
    status: "En Reparación",
    problemDescription: "No enfría adecuadamente en el cabezal izquierdo. Muestra error de temperatura E4.",
    diagnosis: "Fuga de refrigerante en el conducto del cabezal principal y sensor de temperatura defectuoso.",
    solution: "Sellado de fuga, recarga de gas refrigerante R134a y reemplazo del sensor de temperatura NTC.",
    cost: 15000,
    spareParts: [
      { id: "INV-001", name: "Sensor de Temperatura NTC", quantity: 1, price: 3500 }
    ]
  },
  {
    id: "OT-002",
    equipmentName: "Láser de Diodo Depil Max 808",
    equipmentType: "Láser Diodo",
    brand: "LaserTech",
    model: "Depil Max 808",
    serialNumber: "LD-808-9921",
    clientName: "Clínica Dermatológica San Lucas",
    clientPhone: "+54 11 1234-5678",
    entryDate: "2026-08-05",
    status: "Ingresado",
    problemDescription: "Disparador de la pieza de mano no responde. El pedal sí funciona.",
    diagnosis: "Microswitch interno del pulsador de la pieza de mano con desgaste excesivo y contactos sulfatados.",
    solution: "",
    cost: 8000,
    spareParts: []
  },
  {
    id: "OT-003",
    equipmentName: "Radiofrecuencia Accent Prime II",
    equipmentType: "Radiofrecuencia",
    brand: "Alma Lasers",
    model: "Accent Prime II",
    serialNumber: "RF-ACC-2201",
    clientName: "Spa & Bienestar Alvear",
    clientPhone: "+54 11 5555-0199",
    entryDate: "2026-08-06",
    status: "Listo",
    problemDescription: "La pantalla táctil no responde en la esquina superior derecha.",
    diagnosis: "Descalibración del panel digital resistivo por humedad acumulada.",
    solution: "Limpieza profunda de contactos, sellado de humedad periférico y recalibración de pantalla por software.",
    cost: 12000,
    spareParts: []
  }
];

export const initialInventory = [
  {
    id: "INV-001",
    name: "Sensor de Temperatura NTC Criolipólisis",
    category: "SENSORES",
    equipmentType: "Criolipólisis",
    stock: 5,
    minStock: 2,
    price: 3500
  },
  {
    id: "INV-002",
    name: "Microswitch Pulsador de Pieza de Mano",
    category: "CONECTORES",
    equipmentType: "Láser Diodo",
    stock: 12,
    minStock: 5,
    price: 1500
  },
  {
    id: "INV-003",
    name: "Glicerina Neutra Grado Médico (5L)",
    category: "GENERAL",
    equipmentType: "Radiofrecuencia",
    stock: 1,
    minStock: 3,
    price: 4500
  },
  {
    id: "INV-004",
    name: "Capacitor Electrolítico 4700uF 50V de Alta Temperatura",
    category: "CAPACITORES",
    equipmentType: "General",
    stock: 25,
    minStock: 10,
    price: 1200
  },
  {
    id: "INV-005",
    name: "Capacitor Poliéster Metalizado 100nF 400V",
    category: "CAPACITORES",
    equipmentType: "General",
    stock: 50,
    minStock: 20,
    price: 180
  },
  {
    id: "INV-006",
    name: "Resistencia Metal Film 10K Ohm 1W (Pack x10)",
    category: "RESISTENCIAS",
    equipmentType: "General",
    stock: 30,
    minStock: 15,
    price: 250
  },
  {
    id: "INV-007",
    name: "Resistencia Cerámica de Potencia 0.22 Ohm 5W",
    category: "RESISTENCIAS",
    equipmentType: "General",
    stock: 15,
    minStock: 5,
    price: 450
  },
  {
    id: "INV-008",
    name: "Puente Rectificador de Diodos Metal KBPC3510 (35A 1000V)",
    category: "DIODOS",
    equipmentType: "General",
    stock: 8,
    minStock: 3,
    price: 1800
  },
  {
    id: "INV-009",
    name: "Diodo Rápido de Recuperación 1N4937 (Pack x10)",
    category: "DIODOS",
    equipmentType: "General",
    stock: 20,
    minStock: 8,
    price: 350
  },
  {
    id: "INV-010",
    name: "Transistor de Potencia MOSFET IRFP260N 200V 50A",
    category: "TRANSISTORES",
    equipmentType: "General",
    stock: 12,
    minStock: 4,
    price: 2400
  },
  {
    id: "INV-011",
    name: "Transistor IGBT de Potencia FGA25N120 1200V 25A",
    category: "TRANSISTORES",
    equipmentType: "General",
    stock: 6,
    minStock: 2,
    price: 3800
  },
  {
    id: "INV-012",
    name: "Circuito Integrado TL072 Operacional JFET de Bajo Ruido",
    category: "INTEGRADOS",
    equipmentType: "General",
    stock: 15,
    minStock: 5,
    price: 650
  },
  {
    id: "INV-013",
    name: "Circuito Integrado Regulador de Voltaje Positivo LM7815 (15V 1.5A)",
    category: "INTEGRADOS",
    equipmentType: "General",
    stock: 18,
    minStock: 6,
    price: 520
  }
];
