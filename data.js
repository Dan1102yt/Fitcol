// =====================================================
// FOODS — Comida colombiana clasificada por momento y tipo
// Macros aproximados por porción (kcal, p=proteína, c=carbos, f=grasa)
// =====================================================
const FOODS = {
  desayuno: {
    saludable: [
      { name: "Huevos pericos con arepa de maíz", kcal: 380, p: 22, c: 38, f: 16, ingredientes: ["2 huevos","1 arepa pequeña","1 tomate","1/4 cebolla","cilantro","sal"], preparacion: "Sofríe cebolla y tomate picados. Agrega los huevos batidos y mezcla. Sirve con arepa asada." },
      { name: "Calentado liviano con frijoles", kcal: 450, p: 24, c: 55, f: 12, ingredientes: ["1 taza frijoles","1/2 taza arroz integral","1 huevo","aguacate","1 arepa"], preparacion: "Calienta frijoles y arroz con un toque de cebolla. Sirve con huevo a la plancha y arepa asada." },
      { name: "Tazón de avena con frutas y maní", kcal: 360, p: 14, c: 52, f: 11, ingredientes: ["50g avena","200ml leche","1 banano","fresas","maní","canela"], preparacion: "Cocina avena con leche y canela. Cubre con frutas y maní." },
      { name: "Changua con huevo y queso bajo en grasa", kcal: 280, p: 18, c: 22, f: 12, ingredientes: ["1 taza leche","1 huevo","cebolla larga","cilantro","queso fresco","pan integral"], preparacion: "Hierve leche con cebolla, agrega el huevo entero y deja cuajar. Sirve con cilantro, queso y pan." },
      { name: "Huevos al gusto con aguacate y tomate", kcal: 340, p: 20, c: 18, f: 22, ingredientes: ["2 huevos","1/2 aguacate","tomate","sal","aceite de oliva"], preparacion: "Cocina los huevos al gusto. Acompaña con tomate y aguacate en rodajas." },
      { name: "Bowl de yogur con granola casera", kcal: 320, p: 16, c: 42, f: 9, ingredientes: ["200g yogur griego","30g granola","frutos rojos","miel"], preparacion: "Mezcla yogur con granola y frutas frescas." }
    ],
    balanceado: [
      { name: "Calentado paisa", kcal: 620, p: 28, c: 70, f: 22, ingredientes: ["frijoles","arroz","chicharrón","huevo","arepa","plátano maduro"], preparacion: "Calienta frijoles, arroz, chicharrón y plátano. Sirve con huevo frito y arepa." },
      { name: "Tamal tolimense", kcal: 580, p: 26, c: 65, f: 22, ingredientes: ["masa de maíz","arroz","arveja","cerdo","pollo","huevo","hojas de plátano"], preparacion: "Tamal tradicional ya cocinado, calentar al baño maría 30 min." },
      { name: "Arepa con huevo y queso", kcal: 480, p: 22, c: 48, f: 22, ingredientes: ["arepa de maíz","2 huevos","queso costeño","aceite"], preparacion: "Asa la arepa, ábrela, rellena con huevos revueltos y queso." },
      { name: "Caldo de costilla con arepa y huevo", kcal: 520, p: 32, c: 42, f: 22, ingredientes: ["costilla de res","papa","cilantro","cebolla larga","arepa","1 huevo"], preparacion: "Cocina la costilla con papa, cebolla y cilantro 1 hora. Sirve con arepa y huevo." }
    ],
    chatarra: [
      { name: "Pandebono con chocolate", kcal: 520, p: 12, c: 60, f: 24, ingredientes: ["3 pandebonos","chocolate caliente con leche entera","panela"], preparacion: "Calienta los pandebonos. Sirve con chocolate." },
      { name: "Buñuelos con natilla", kcal: 600, p: 14, c: 70, f: 28, ingredientes: ["4 buñuelos","natilla","panela"], preparacion: "Acompaña los buñuelos con natilla." },
      { name: "Empanadas de carne con ají", kcal: 540, p: 16, c: 62, f: 24, ingredientes: ["3 empanadas fritas","ají","limón"], preparacion: "Fríe las empanadas y sirve con ají." },
      { name: "Almojábana con avena tradicional", kcal: 480, p: 14, c: 58, f: 18, ingredientes: ["2 almojábanas","avena con leche y panela"], preparacion: "Sirve almojábanas con avena caliente." }
    ]
  },
  almuerzo: {
    saludable: [
      { name: "Pollo a la plancha con arroz integral y ensalada", kcal: 520, p: 42, c: 55, f: 12, ingredientes: ["150g pechuga","1 taza arroz integral","lechuga","tomate","aguacate 1/4","limón","ajo"], preparacion: "Marina la pechuga con ajo y limón. Asa a la plancha. Sirve con arroz integral y ensalada fresca." },
      { name: "Sudado de pollo light", kcal: 540, p: 38, c: 56, f: 14, ingredientes: ["150g pollo sin piel","papa","zanahoria","cebolla","tomate","cilantro","arroz"], preparacion: "Sofríe cebolla y tomate, agrega pollo y verduras. Cocina 25 min. Sirve con arroz." },
      { name: "Sancocho de pollo liviano", kcal: 500, p: 36, c: 50, f: 14, ingredientes: ["pollo sin piel","yuca","mazorca","plátano verde","cilantro","cebolla larga"], preparacion: "Cocina todo en olla con agua 40 min. Sirve con cilantro fresco." },
      { name: "Trucha al ajillo con yuca y ensalada", kcal: 560, p: 40, c: 48, f: 18, ingredientes: ["180g trucha","ajo","yuca","ensalada mixta","limón"], preparacion: "Sella la trucha en sartén con ajo. Sirve con yuca cocida y ensalada." },
      { name: "Ajiaco light", kcal: 480, p: 34, c: 56, f: 10, ingredientes: ["pollo sin piel","papa criolla","papa sabanera","mazorca","guascas","alcaparras (poco)","crema light"], preparacion: "Cocina papas, mazorca y pollo con guascas. Sirve con un toque de crema y alcaparras." },
      { name: "Bandeja paisa fitness", kcal: 620, p: 48, c: 62, f: 18, ingredientes: ["frijoles","arroz integral","carne molida magra","huevo","plátano horneado","aguacate 1/4","arepa pequeña"], preparacion: "Versión liviana: carne magra, plátano al horno, sin chicharrón frito." }
    ],
    balanceado: [
      { name: "Bandeja paisa", kcal: 950, p: 42, c: 90, f: 42, ingredientes: ["frijoles","arroz","chicharrón","carne molida","chorizo","plátano maduro","huevo","arepa","aguacate"], preparacion: "Plato típico antioqueño con todos los componentes." },
      { name: "Sobrebarriga en salsa criolla", kcal: 680, p: 44, c: 60, f: 28, ingredientes: ["sobrebarriga","papa","tomate","cebolla","cilantro","arroz","plátano"], preparacion: "Cocina la sobrebarriga 2h. Prepara salsa criolla con tomate y cebolla. Sirve con arroz y plátano." },
      { name: "Lechona tolimense", kcal: 780, p: 38, c: 60, f: 38, ingredientes: ["lechona","arepa de maíz blanco","insulso"], preparacion: "Sirve lechona caliente con arepa." },
      { name: "Mute santandereano", kcal: 620, p: 36, c: 62, f: 22, ingredientes: ["maíz pelado","carne de res","callo","papa","arracacha","cilantro"], preparacion: "Cocina el maíz remojado con carnes y verduras 1.5h." },
      { name: "Mojarra frita con patacón", kcal: 720, p: 42, c: 60, f: 32, ingredientes: ["mojarra entera","plátano verde","arroz con coco","ensalada"], preparacion: "Fríe la mojarra. Sirve con patacones, arroz con coco y ensalada." }
    ],
    chatarra: [
      { name: "Salchipapa criolla", kcal: 980, p: 22, c: 95, f: 56, ingredientes: ["papa francesa","salchichas","huevo de codorniz","ripio","salsas"], preparacion: "Fríe papas y salchichas. Sirve con salsas y ripio." },
      { name: "Hamburguesa colombiana con todo", kcal: 1100, p: 38, c: 85, f: 65, ingredientes: ["pan","carne 150g","queso","tocineta","piña","huevo de codorniz","papas a la francesa"], preparacion: "Arma la hamburguesa con todos los ingredientes y acompaña con papas." },
      { name: "Perro caliente colombiano", kcal: 850, p: 22, c: 80, f: 48, ingredientes: ["pan","salchicha","ripio","queso","piña","salsas"], preparacion: "Arma el perro con salchicha asada y todos los acompañamientos." },
      { name: "Picada criolla", kcal: 1300, p: 60, c: 85, f: 78, ingredientes: ["chicharrón","chorizo","morcilla","carne","papa criolla","yuca","plátano","arepa"], preparacion: "Plato compartido con embutidos y fritos típicos." }
    ]
  },
  cena: {
    saludable: [
      { name: "Pechuga al horno con verduras al vapor", kcal: 380, p: 40, c: 22, f: 12, ingredientes: ["150g pechuga","brócoli","zanahoria","calabacín","aceite de oliva","ajo"], preparacion: "Hornea la pechuga 25 min. Cocina verduras al vapor 8 min." },
      { name: "Sopa de verduras con pollo", kcal: 320, p: 28, c: 30, f: 8, ingredientes: ["pollo desmechado","apio","zanahoria","cebolla","habichuela","cilantro"], preparacion: "Sofríe verduras, agrega caldo y pollo. Cocina 25 min." },
      { name: "Tortilla de claras con espinaca y arepa", kcal: 280, p: 26, c: 28, f: 8, ingredientes: ["4 claras + 1 huevo","espinaca","queso bajo en grasa","arepa pequeña"], preparacion: "Bate los huevos con espinaca. Cocina en sartén. Sirve con arepa." },
      { name: "Pescado al vapor con quinua", kcal: 420, p: 36, c: 42, f: 10, ingredientes: ["150g tilapia","quinua","limón","cilantro","ají dulce"], preparacion: "Cocina pescado al vapor con limón. Sirve con quinua y verduras." },
      { name: "Caldo de costilla magra con verduras", kcal: 360, p: 30, c: 28, f: 14, ingredientes: ["costilla magra","papa","cebolla","cilantro","cilantro"], preparacion: "Cocina la costilla con papa y verduras 1h. Retira la grasa visible." }
    ],
    balanceado: [
      { name: "Arroz con pollo casero", kcal: 620, p: 36, c: 68, f: 18, ingredientes: ["arroz","pollo","arveja","zanahoria","pimentón","cebolla","alcaparras"], preparacion: "Sofríe verduras, agrega arroz y pollo. Cocina con caldo 25 min." },
      { name: "Pasta con carne molida y queso", kcal: 680, p: 32, c: 75, f: 22, ingredientes: ["pasta","carne molida","tomate","cebolla","queso","albahaca"], preparacion: "Cocina pasta. Prepara salsa con carne y tomate. Mezcla y gratina con queso." },
      { name: "Frijoles con arroz y carne", kcal: 580, p: 32, c: 72, f: 14, ingredientes: ["frijoles","arroz","carne molida","plátano","aguacate"], preparacion: "Plato típico de cena: frijoles con arroz, carne molida y plátano." }
    ],
    chatarra: [
      { name: "Pizza con borde de queso", kcal: 950, p: 38, c: 95, f: 45, ingredientes: ["pizza personal","queso extra","peperoni"], preparacion: "Pizza congelada al horno o domiciliario." },
      { name: "Hot dog con papas", kcal: 820, p: 22, c: 82, f: 45, ingredientes: ["pan","salchicha","papas","salsas"], preparacion: "Arma el hot dog y acompaña con papas fritas." },
      { name: "Pollo broaster con papas", kcal: 1050, p: 48, c: 75, f: 58, ingredientes: ["1/4 pollo apanado","papa francesa","ensalada coleslaw"], preparacion: "Pollo apanado frito con papas y ensalada." }
    ]
  },
  snack: {
    saludable: [
      { name: "Manzana con maní natural", kcal: 220, p: 6, c: 28, f: 10, ingredientes: ["1 manzana","30g maní"], preparacion: "Lava y come la manzana con maní natural sin sal." },
      { name: "Yogur griego con almendras", kcal: 200, p: 18, c: 14, f: 8, ingredientes: ["150g yogur griego","20g almendras","miel"], preparacion: "Mezcla yogur con almendras y un toque de miel." },
      { name: "Patilla o sandía", kcal: 90, p: 2, c: 22, f: 0, ingredientes: ["1 taza sandía"], preparacion: "Refresca y aporta agua." },
      { name: "Boli de fruta natural", kcal: 110, p: 2, c: 25, f: 1, ingredientes: ["fruta natural","agua","poca azúcar"], preparacion: "Licúa la fruta y congela en bolsas." },
      { name: "Hard boiled eggs y banano", kcal: 240, p: 16, c: 28, f: 8, ingredientes: ["2 huevos cocidos","1 banano"], preparacion: "Hierve los huevos 9 min. Acompaña con banano." }
    ],
    balanceado: [
      { name: "Jugo natural en agua con galletas integrales", kcal: 280, p: 6, c: 52, f: 6, ingredientes: ["jugo de mora en agua","4 galletas integrales"], preparacion: "Licúa la fruta con agua. Acompaña con galletas." },
      { name: "Sándwich de pollo", kcal: 380, p: 28, c: 42, f: 10, ingredientes: ["pan integral","pollo","tomate","lechuga","mayonesa light"], preparacion: "Arma el sándwich con todos los ingredientes." }
    ],
    chatarra: [
      { name: "Papas de paquete y gaseosa", kcal: 480, p: 4, c: 70, f: 22, ingredientes: ["papas fritas paquete","gaseosa 350ml"], preparacion: "Snack rápido típico." },
      { name: "Obleas con arequipe", kcal: 420, p: 6, c: 68, f: 14, ingredientes: ["obleas","arequipe","queso rallado"], preparacion: "Arma las obleas con arequipe abundante." },
      { name: "Chocolatina y galletas", kcal: 520, p: 6, c: 72, f: 24, ingredientes: ["chocolatina","paquete de galletas dulces"], preparacion: "Snack dulce alto en azúcar." }
    ]
  }
};

// =====================================================
// EXERCISES por grupo muscular
// =====================================================
const EXERCISES = {
  pecho: [
    { name: "Press banca con barra", equipo: "barra" },
    { name: "Press inclinado con mancuernas", equipo: "mancuernas" },
    { name: "Press declinado", equipo: "barra" },
    { name: "Aperturas con mancuernas", equipo: "mancuernas" },
    { name: "Cruce en polea", equipo: "polea" },
    { name: "Fondos en paralelas", equipo: "peso corporal" },
    { name: "Flexiones de pecho", equipo: "peso corporal" },
    { name: "Pec deck (contractor)", equipo: "máquina" }
  ],
  espalda: [
    { name: "Dominadas", equipo: "peso corporal" },
    { name: "Peso muerto convencional", equipo: "barra" },
    { name: "Remo con barra", equipo: "barra" },
    { name: "Remo con mancuerna a una mano", equipo: "mancuernas" },
    { name: "Jalón al pecho en polea", equipo: "polea" },
    { name: "Remo en polea baja", equipo: "polea" },
    { name: "Pull-over con mancuerna", equipo: "mancuernas" },
    { name: "Hiperextensiones", equipo: "peso corporal" }
  ],
  piernas: [
    { name: "Sentadilla con barra", equipo: "barra" },
    { name: "Peso muerto rumano", equipo: "barra" },
    { name: "Prensa de piernas", equipo: "máquina" },
    { name: "Zancadas con mancuernas", equipo: "mancuernas" },
    { name: "Hip thrust con barra", equipo: "barra" },
    { name: "Sentadilla búlgara", equipo: "mancuernas" },
    { name: "Extensiones de cuádriceps", equipo: "máquina" },
    { name: "Curl femoral acostado", equipo: "máquina" },
    { name: "Elevación de gemelos", equipo: "máquina" },
    { name: "Sentadilla goblet", equipo: "mancuernas" }
  ],
  hombros: [
    { name: "Press militar con barra", equipo: "barra" },
    { name: "Press Arnold", equipo: "mancuernas" },
    { name: "Elevaciones laterales", equipo: "mancuernas" },
    { name: "Elevaciones frontales", equipo: "mancuernas" },
    { name: "Pájaros (rear delt)", equipo: "mancuernas" },
    { name: "Face pull en polea", equipo: "polea" },
    { name: "Encogimientos", equipo: "mancuernas" }
  ],
  brazos: [
    { name: "Curl con barra", equipo: "barra" },
    { name: "Curl alterno con mancuernas", equipo: "mancuernas" },
    { name: "Curl martillo", equipo: "mancuernas" },
    { name: "Curl en predicador", equipo: "máquina" },
    { name: "Press francés con barra Z", equipo: "barra" },
    { name: "Tríceps en polea", equipo: "polea" },
    { name: "Fondos en banca", equipo: "peso corporal" },
    { name: "Patada de tríceps", equipo: "mancuernas" }
  ],
  core: [
    { name: "Plancha frontal", equipo: "peso corporal" },
    { name: "Plancha lateral", equipo: "peso corporal" },
    { name: "Crunch en polea (rezo)", equipo: "polea" },
    { name: "Elevación de piernas colgado", equipo: "peso corporal" },
    { name: "Ab wheel", equipo: "rueda abdominal" },
    { name: "Russian twist con disco", equipo: "disco" },
    { name: "Mountain climbers", equipo: "peso corporal" }
  ]
};

// =====================================================
// PARÁMETROS DE ENTRENAMIENTO según objetivo
// =====================================================
const TRAINING_PARAMS = {
  hipertrofia: { sets: "3-4", reps: "8-12", rest: "60-90s", desc: "Volumen moderado-alto, peso medio. Ideal para crecimiento muscular." },
  fuerza:      { sets: "4-6", reps: "3-6",  rest: "2-5 min", desc: "Cargas altas, pocas reps. Foco en levantar más peso." },
  resistencia: { sets: "2-3", reps: "15-20+", rest: "30-60s", desc: "Cargas bajas, muchas reps. Mejora resistencia muscular." },
  potencia:    { sets: "3-5", reps: "3-5 explosivos", rest: "2-3 min", desc: "Movimientos explosivos. Foco en velocidad de ejecución." }
};

// =====================================================
// PLANTILLAS DE DISTRIBUCIÓN
// Cada día define los grupos musculares a trabajar
// =====================================================
const DISTRIBUTIONS = {
  fullbody: {
    name: "Full Body",
    desc: "Todo el cuerpo en cada sesión. Ideal para 2-3 días/semana.",
    daysSplit: {
      1: [["pecho","espalda","piernas","hombros","brazos","core"]],
      2: [
        ["pecho","espalda","piernas","core"],
        ["hombros","brazos","piernas","core"]
      ],
      3: [
        ["pecho","espalda","piernas","core"],
        ["hombros","brazos","piernas","core"],
        ["pecho","espalda","piernas","hombros"]
      ],
      4: [
        ["pecho","espalda","piernas","core"],
        ["hombros","brazos","piernas","core"],
        ["pecho","espalda","piernas","hombros"],
        ["brazos","piernas","core","hombros"]
      ]
    }
  },
  upperlower: {
    name: "Upper / Lower",
    desc: "Alterna tren superior e inferior. Ideal para 4 días/semana.",
    daysSplit: {
      2: [
        ["pecho","espalda","hombros","brazos"],
        ["piernas","core"]
      ],
      4: [
        ["pecho","espalda","hombros","brazos"],
        ["piernas","core"],
        ["pecho","espalda","hombros","brazos"],
        ["piernas","core"]
      ],
      6: [
        ["pecho","hombros","brazos"],
        ["piernas","core"],
        ["espalda","brazos"],
        ["piernas","core"],
        ["pecho","espalda","hombros"],
        ["piernas","core"]
      ]
    }
  },
  ppl: {
    name: "Push / Pull / Legs",
    desc: "Empuje, jalón y piernas. Ideal para 3 o 6 días/semana.",
    daysSplit: {
      3: [
        ["pecho","hombros","brazos"],   // Push (tríceps via brazos)
        ["espalda","brazos"],            // Pull (bíceps via brazos)
        ["piernas","core"]               // Legs
      ],
      6: [
        ["pecho","hombros","brazos"],
        ["espalda","brazos"],
        ["piernas","core"],
        ["pecho","hombros","brazos"],
        ["espalda","brazos"],
        ["piernas","core"]
      ]
    }
  },
  brosplit: {
    name: "Bro Split",
    desc: "Un grupo muscular por día. Ideal para 5 días/semana.",
    daysSplit: {
      5: [
        ["pecho","core"],
        ["espalda"],
        ["piernas"],
        ["hombros","core"],
        ["brazos"]
      ]
    }
  }
};

// Recomendación de distribución según días disponibles
function recommendDistribution(days) {
  if (days <= 0) return null;
  if (days <= 3) return "fullbody";
  if (days === 4) return "upperlower";
  if (days === 5) return "brosplit";
  return "ppl"; // 6
}

// Recomendación de días según objetivo
function recommendDays(objective) {
  return ({
    hipertrofia: 4,
    fuerza: 4,
    resistencia: 3,
    potencia: 3
  })[objective] || 3;
}
