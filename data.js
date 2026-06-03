// =====================================================
// FOODS — Comida colombiana clasificada por momento y tipo
// Macros aproximados por porción (kcal, p=proteína, c=carbos, f=grasa)
// =====================================================
const FOODS = {
  desayuno: {
    saludable: [
      { name: "Changua con pan", kcal: 310, p: 12, c: 38, f: 11, ingredientes: ["1.5 tazas leche","1 huevo","cebolla larga","cilantro","sal","1 pan tajado"], preparacion: "Hierve la leche con cebolla larga picada. Rompe el huevo dentro y deja cuajar 3 min. Sirve con cilantro y pan." },
      { name: "Empanadas de pipián", kcal: 280, p: 8, c: 38, f: 10, ingredientes: ["masa de maíz","papa criolla","arveja amarilla","hogao","ají"], preparacion: "Forma discos de masa, rellena con papa y pipián. Cierra en media luna. Fríe en aceite caliente hasta dorar." },
      { name: "Huevos pericos con arepa", kcal: 390, p: 20, c: 32, f: 18, ingredientes: ["2 huevos","1 tomate","1/4 cebolla cabezona","cilantro","1 arepa mediana","aceite","sal"], preparacion: "Sofríe cebolla y tomate picados. Agrega huevos batidos y revuelve. Asa la arepa. Sirve juntos." },
      { name: "Arepas de maíz con mantequilla", kcal: 340, p: 8, c: 52, f: 12, ingredientes: ["2 arepas de maíz blanco","20g mantequilla","sal al gusto"], preparacion: "Asa las arepas en plancha o parrilla. Unta mantequilla en caliente y añade sal." },
      { name: "Pandebono con café", kcal: 290, p: 10, c: 38, f: 11, ingredientes: ["3 pandebonos","1 taza café tinto o con leche"], preparacion: "Calienta los pandebonos en horno 5 min. Acompaña con tinto o café con leche." }
    ],
    balanceado: [
      { name: "Arepa de choclo con quesito", kcal: 380, p: 14, c: 52, f: 13, ingredientes: ["2 arepas de choclo","80g quesito campesino"], preparacion: "Calienta las arepas en parrilla o sartén hasta dorar. Sirve con quesito fresco." },
      { name: "Arepa de huevo", kcal: 420, p: 18, c: 45, f: 18, ingredientes: ["2 arepas de maíz","2 huevos","aceite para freír","sal"], preparacion: "Fríe la arepa en aceite caliente. Haz un hueco, inyecta el huevo batido y sella. Fríe hasta dorar." },
      { name: "Calentado con huevo", kcal: 520, p: 22, c: 68, f: 16, ingredientes: ["1 taza frijoles cocidos","1 taza arroz cocido","2 huevos","cebolla larga","cilantro","aceite"], preparacion: "Sofríe cebolla, agrega frijoles y arroz del día anterior. Prepara los huevos al gusto. Sirve todo junto." },
      { name: "Chocolate con pan y queso", kcal: 480, p: 16, c: 62, f: 18, ingredientes: ["1 taza chocolate de mesa","1 taza leche","2 panes de sal","60g queso campesino"], preparacion: "Disuelve el chocolate en leche caliente. Sirve con pan y queso para mojar." }
    ],
    chatarra: [
      { name: "Tamal tolimense", kcal: 580, p: 24, c: 72, f: 20, ingredientes: ["masa de maíz aliñada","arroz","arveja","zanahoria","cerdo","pollo","huevo duro","hojas de plátano"], preparacion: "Arma el tamal con todos los ingredientes en hoja de plátano. Cocina al vapor 2 horas o calienta uno ya hecho." },
      { name: "Calentado con huevo", kcal: 520, p: 22, c: 68, f: 16, ingredientes: ["1 taza frijoles cocidos","1 taza arroz cocido","2 huevos","cebolla larga","cilantro","aceite"], preparacion: "Sofríe cebolla, agrega frijoles y arroz del día anterior. Prepara los huevos al gusto. Sirve todo junto." },
      { name: "Arepa de huevo", kcal: 420, p: 18, c: 45, f: 18, ingredientes: ["2 arepas de maíz","2 huevos","aceite para freír","sal"], preparacion: "Fríe la arepa en aceite caliente. Haz un hueco, inyecta el huevo batido y sella. Fríe hasta dorar." },
      { name: "Chocolate con pan y queso", kcal: 480, p: 16, c: 62, f: 18, ingredientes: ["1 taza chocolate de mesa","1 taza leche","2 panes de sal","60g queso campesino"], preparacion: "Disuelve el chocolate en leche caliente. Sirve con pan y queso para mojar." }
    ]
  },
  almuerzo: {
    saludable: [
      { name: "Hervido de res con verduras", kcal: 460, p: 32, c: 42, f: 12, ingredientes: ["carne de res","papa","zanahoria","yuca","habichuela","cebolla","cilantro"], preparacion: "Cocina la carne con todas las verduras en agua hasta que estén suaves, aprox. 1 hora." },
      { name: "Sopa de lentejas con arroz", kcal: 480, p: 22, c: 72, f: 8, ingredientes: ["lentejas","zanahoria","papa","cebolla","tomate","comino","arroz"], preparacion: "Sofríe cebolla y tomate. Agrega lentejas, papa y zanahoria. Cocina 25 min. Sirve con arroz." },
      { name: "Ajiaco bogotano", kcal: 520, p: 32, c: 58, f: 14, ingredientes: ["pollo","papa criolla","papa sabanera","papa pastusa","mazorca","guascas","crema de leche","alcaparras"], preparacion: "Cocina las papas y el pollo con guascas y mazorca en agua 45 min. Sirve con crema y alcaparras al lado." },
      { name: "Sudado de pollo con papa", kcal: 540, p: 34, c: 52, f: 14, ingredientes: ["pollo en presas","papa","tomate","cebolla","cilantro","comino","arroz"], preparacion: "Sofríe cebolla y tomate, agrega pollo y papa. Cubre con agua y cocina tapado 30 min. Sirve con arroz." },
      { name: "Arroz con pollo colombiano", kcal: 620, p: 36, c: 74, f: 16, ingredientes: ["pollo en presas","arroz","arveja","zanahoria","pimentón","cebolla","ajo","comino","achiote"], preparacion: "Sofríe las verduras con pollo. Agrega arroz y caldo. Cocina tapado a fuego bajo 25 min." }
    ],
    balanceado: [
      { name: "Sancocho de gallina con arroz", kcal: 680, p: 38, c: 72, f: 18, ingredientes: ["1/2 gallina criolla","papa","yuca","mazorca","plátano verde","cilantro","cebolla larga","ajo","arroz"], preparacion: "Cocina la gallina con papa, yuca y mazorca en agua 1.5 horas. Agrega cilantro al final. Sirve con arroz aparte." },
      { name: "Frijoles con chicharrón y arroz", kcal: 780, p: 34, c: 88, f: 26, ingredientes: ["frijoles cargamanto","chicharrón","arroz","plátano maduro","hogao","cebolla","comino"], preparacion: "Cocina los frijoles 1 hora. Fríe el chicharrón. Sirve con arroz, plátano y hogao." },
      { name: "Cazuela de mariscos", kcal: 580, p: 42, c: 38, f: 22, ingredientes: ["camarones","calamares","mejillones","leche de coco","cebolla","ajo","cilantro","crema de leche"], preparacion: "Sofríe cebolla y ajo. Agrega mariscos y leche de coco. Cocina 15 min. Incorpora crema al final." },
      { name: "Posta negra cartagenera", kcal: 620, p: 44, c: 32, f: 28, ingredientes: ["lomo de res","panela","vino tinto","cebolla","ajo","tomate","papas","plátano"], preparacion: "Marina la carne. Dora en aceite y cocina en salsa de panela y vino 1.5 horas. Sirve con papas y plátano." }
    ],
    chatarra: [
      { name: "Bandeja paisa completa", kcal: 1100, p: 58, c: 112, f: 42, ingredientes: ["frijoles rojos","arroz blanco","chicharrón","carne molida","chorizo antioqueño","morcilla","plátano maduro frito","huevo frito","arepa","aguacate"], preparacion: "Prepara cada componente por separado. Sirve todos juntos en plato grande." },
      { name: "Frijoles con chicharrón y arroz", kcal: 780, p: 34, c: 88, f: 26, ingredientes: ["frijoles cargamanto","chicharrón","arroz","plátano maduro","hogao","cebolla","comino"], preparacion: "Cocina los frijoles 1 hora. Fríe el chicharrón. Sirve con arroz, plátano y hogao." },
      { name: "Sancocho de gallina con arroz", kcal: 680, p: 38, c: 72, f: 18, ingredientes: ["1/2 gallina criolla","papa","yuca","mazorca","plátano verde","cilantro","cebolla larga","ajo","arroz"], preparacion: "Cocina la gallina con papa, yuca y mazorca en agua 1.5 horas. Agrega cilantro al final. Sirve con arroz aparte." }
    ]
  },
  cena: {
    saludable: [
      { name: "Caldo de costilla", kcal: 280, p: 22, c: 18, f: 12, ingredientes: ["costilla de res","papa","cebolla larga","cilantro","hierbas","sal"], preparacion: "Cocina la costilla con papa y cebolla en agua abundante 1 hora. Sirve caliente con cilantro." },
      { name: "Crema de ahuyama", kcal: 220, p: 6, c: 32, f: 7, ingredientes: ["300g ahuyama","cebolla","ajo","crema de leche","caldo de pollo","sal"], preparacion: "Cocina ahuyama con cebolla y ajo. Licúa y regresa al fuego. Agrega crema y sazona." },
      { name: "Sopa de pasta con pollo", kcal: 380, p: 24, c: 48, f: 8, ingredientes: ["pasta corta","pechuga de pollo","zanahoria","papa","cebolla","cilantro"], preparacion: "Cocina el pollo en agua con verduras. Agrega la pasta 10 min antes de servir. Sazona con sal y cilantro." },
      { name: "Aguapanela con queso", kcal: 240, p: 8, c: 42, f: 6, ingredientes: ["1 panela mediana","2 tazas agua","60g queso campesino"], preparacion: "Disuelve la panela en agua caliente. Sirve con queso fresco para mojar o desmenuzar dentro." },
      { name: "Papa criolla con hogao", kcal: 260, p: 6, c: 42, f: 8, ingredientes: ["300g papa criolla","tomate","cebolla","cilantro","comino","aceite"], preparacion: "Cocina la papa criolla con cáscara en agua salada. Prepara hogao con tomate y cebolla sofrito. Sirve juntos." }
    ],
    balanceado: [
      { name: "Arepa con queso blanco", kcal: 310, p: 12, c: 38, f: 12, ingredientes: ["2 arepas de maíz","80g queso blanco campesino"], preparacion: "Asa las arepas en plancha hasta dorar. Sirve con queso fresco partido o derretido encima." },
      { name: "Mazamorra con bocadillo", kcal: 290, p: 6, c: 62, f: 3, ingredientes: ["1 taza maíz partido cocido","1 taza leche","azúcar","2 bocadillos"], preparacion: "Calienta el maíz cocinado con leche y azúcar. Sirve con bocadillo de guayaba al lado." },
      { name: "Sopa de guineo", kcal: 340, p: 14, c: 52, f: 8, ingredientes: ["2 guineos verdes","pollo desmechado","cebolla","cilantro","papa","sal"], preparacion: "Pela y pica los guineos. Cocina con pollo, papa y cebolla en agua 30 min. Sazona con cilantro." },
      { name: "Arroz con leche", kcal: 320, p: 8, c: 58, f: 7, ingredientes: ["1 taza arroz","2 tazas leche","canela","azúcar o panela","pizca de sal"], preparacion: "Cocina el arroz en agua. Agrega leche, canela y azúcar. Revuelve a fuego bajo 20 min hasta espesar." }
    ],
    chatarra: [
      { name: "Obleas con arequipe", kcal: 380, p: 6, c: 72, f: 8, ingredientes: ["4 obleas","4 cucharadas arequipe","queso rallado opcional"], preparacion: "Extiende arequipe sobre cada oblea. Añade queso si deseas. Arma en capas." },
      { name: "Mazamorra con bocadillo", kcal: 290, p: 6, c: 62, f: 3, ingredientes: ["1 taza maíz partido cocido","1 taza leche","azúcar","2 bocadillos"], preparacion: "Calienta el maíz cocinado con leche y azúcar. Sirve con bocadillo de guayaba al lado." },
      { name: "Arroz con leche", kcal: 320, p: 8, c: 58, f: 7, ingredientes: ["1 taza arroz","2 tazas leche","canela","azúcar o panela","pizca de sal"], preparacion: "Cocina el arroz en agua. Agrega leche, canela y azúcar. Revuelve a fuego bajo 20 min hasta espesar." }
    ]
  },
  snack: {
    saludable: [
      { name: "Mango biche con sal y limón", kcal: 90, p: 1, c: 22, f: 0, ingredientes: ["1 mango biche","sal","limón","ají opcional"], preparacion: "Pela y pica el mango verde. Rocía con limón y sal. Agrega ají si deseas." },
      { name: "Lulada", kcal: 140, p: 1, c: 34, f: 0, ingredientes: ["3 lulos","azúcar al gusto","1 taza agua fría","hielo"], preparacion: "Extrae la pulpa de los lulos. Mezcla con agua fría y azúcar. Sirve con hielo, sin licuar para conservar la textura." },
      { name: "Chontaduro con sal y miel", kcal: 180, p: 3, c: 38, f: 2, ingredientes: ["4 chontaduros cocidos","sal al gusto","miel o panela"], preparacion: "Cocina los chontaduros en agua con sal 45 min. Sirve con sal y un chorrito de miel." }
    ],
    balanceado: [
      { name: "Bocadillo con queso", kcal: 220, p: 6, c: 42, f: 5, ingredientes: ["2 bocadillos de guayaba","60g queso blanco campesino"], preparacion: "Corta el bocadillo en rodajas. Sirve con queso fresco al lado o encima." },
      { name: "Patacones con hogao", kcal: 280, p: 4, c: 42, f: 10, ingredientes: ["1 plátano verde","aceite para freír","tomate","cebolla","cilantro","sal"], preparacion: "Fríe rodajas de plátano, aplasta y vuelve a freír. Sirve con hogao de tomate y cebolla." },
      { name: "Cocada blanca", kcal: 240, p: 2, c: 38, f: 9, ingredientes: ["1 taza coco rallado","1/2 taza azúcar","1/4 taza agua","vainilla"], preparacion: "Cocina el azúcar con agua hasta punto de caramelo suave. Agrega coco y vainilla. Moldea en porciones y deja enfriar." },
      { name: "Cholado", kcal: 280, p: 2, c: 68, f: 1, ingredientes: ["hielo raspado","jarabe de frutas","frutas frescas","leche condensada","crema"], preparacion: "Raspa el hielo. Añade frutas, jarabe y terminaciones con leche condensada." }
    ],
    chatarra: [
      { name: "Aborrajado de plátano", kcal: 320, p: 8, c: 48, f: 11, ingredientes: ["1 plátano maduro","queso campesino","harina de trigo","huevo","aceite"], preparacion: "Aplana rodajas de plátano, rellena con queso. Pasa por harina y huevo batido. Fríe hasta dorar." },
      { name: "Cholado", kcal: 280, p: 2, c: 68, f: 1, ingredientes: ["hielo raspado","jarabe de frutas","frutas frescas","leche condensada","crema"], preparacion: "Raspa el hielo. Añade frutas, jarabe y terminaciones con leche condensada." },
      { name: "Cocada blanca", kcal: 240, p: 2, c: 38, f: 9, ingredientes: ["1 taza coco rallado","1/2 taza azúcar","1/4 taza agua","vainilla"], preparacion: "Cocina el azúcar con agua hasta punto de caramelo suave. Agrega coco y vainilla. Moldea en porciones y deja enfriar." }
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
