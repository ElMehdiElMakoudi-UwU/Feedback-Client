import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type ItemInput = {
  nameAr: string;
  nameFr: string;
  descriptionAr?: string;
  descriptionFr?: string;
  noteAr?: string;
  noteFr?: string;
  price?: number;
  priceLarge?: number;
  comingSoon?: boolean;
};

type CategoryInput = {
  nameAr: string;
  nameFr: string;
  items: ItemInput[];
};

type SectionInput = {
  nameAr: string;
  nameFr: string;
  categories: CategoryInput[];
};

const menu: SectionInput[] = [
  {
    nameAr: "بداية طيبة",
    nameFr: "Les bons débuts !",
    categories: [
      {
        nameAr: "المقبلات الباردة",
        nameFr: "Les Entrées Froides",
        items: [
          {
            nameFr: "Salade César Poulet",
            nameAr: "سلطة سيزار بالدجاج",
            descriptionAr:
              "صدر دجاج مشوي - خس - خبز محمص - جبن بارميزان - صلصة سيزار الكلاسيكية",
            price: 40,
          },
          {
            nameFr: "Salade Fruits De Mer",
            nameAr: "سلطة فواكه البحر",
            descriptionAr:
              "تشكيلة من فواكه البحر - كلمار - قيمرون - محار - بلح البحر - زيت الزيتون - عصير الليمون - أعشاب البحر - فلفل - ملح",
            price: 55,
          },
          {
            nameFr: "Salade Healthy",
            nameAr: "سلطة هيلثي",
            descriptionAr:
              "دجاج مشوي - زبيب - جوز - خيار - طماطم - جبنة إيدام - بيض مسلوق - ذرة - أناناس - أفوكادو - مانجا - صوص بلسميك بالعسل",
            price: 50,
          },
          {
            nameFr: "Salade Niçoise",
            nameAr: "سلطة نيسواز",
            descriptionAr:
              "تونة - بطاطس - فاصوليا خضراء - بيض مسلوق - زيتون أسود - طماطم - بصل - زيت الزيتون",
            price: 35,
          },
          {
            nameFr: "Salade Maroccan",
            nameAr: "سلطة مغربية",
            descriptionAr:
              "طماطم - فلفل أخضر - بصل - خيار - نعناع - بقدونس - زيت الزيتون - خل - ملح - فلفل - عصير الليمون",
            price: 25,
          },
          {
            nameFr: "Salade Sindibad",
            nameAr: "سلطة سندباد",
            descriptionAr:
              "كينوا - أفوكادو - سلمون مدخن - قيمرون - جبن منوع - زيت الزيتون - صوص مميز حسب المطبخ",
            price: 70,
          },
          {
            nameFr: "Salade Burrata",
            nameAr: "سلطة بوراتا",
            descriptionAr:
              "جبن بوراتا إيطالي - طماطم - ريحان - زيت الزيتون - ملح بحري - فلفل أسود - صوص بلسميك بالعسل",
            price: 75,
          },
        ],
      },
      {
        nameAr: "المقبلات الساخنة",
        nameFr: "Les Entrées Chaudes",
        items: [
          {
            nameFr: "Soupe De Poisson",
            nameAr: "شوربة السمك",
            descriptionAr:
              "شوربة بحرية دافئة بنكهات السمك، مطهوة مع الخضار والأعشاب المتوسطية، لتقدم نكهة عميقة ومريحة",
            price: 30,
          },
          {
            nameFr: "Crevettes Pil-Pil",
            nameAr: "قيمرون بيل بيل",
            descriptionAr:
              "قيمرون طازج في صلصة البيل بيل الشهيرة المصنوعة من الثوم والفلفل الحار وزيت الزيتون، ليقدم طبقاً قوي النكهة",
            price: 50,
          },
          {
            nameFr: "Kefta À La Sauce Tomate",
            nameAr: "كفتة بصلصة الطماطم",
            descriptionAr:
              "كرات كفتة مطهوة في صلصة طماطم غنية بالأعشاب والتوابل المغربية، نكهة دافئة ومتوازنة",
            price: 40,
          },
          {
            nameFr: "Croquettes De Poisson",
            nameAr: "كروكيت السمك",
            noteAr: "٣ قطع",
            noteFr: "3 pièces",
            descriptionAr:
              "كريات مقرمشة من السمك ممزوجة بالأعشاب والبهارات، تُقدَّم مع صوص لذيذ يعزز نكهتها البحرية",
            price: 30,
          },
          {
            nameFr: "Lasagnes Italiennes",
            nameAr: "لازانيا إيطالية",
            descriptionAr: "باستا - لحم مفروم - صلصة البيشاميل - الجبن",
            price: 35,
          },
        ],
      },
    ],
  },
  {
    nameAr: "على الطريقة الإيطالية",
    nameFr: "À l'italienne...",
    categories: [
      {
        nameAr: "بيتزا",
        nameFr: "Pizza",
        items: [
          {
            nameFr: "Pizza Margarita",
            nameAr: "بيتزا مارغريتا",
            descriptionAr: "موزاريلا - صلصة طماطم",
            price: 25,
            priceLarge: 40,
          },
          {
            nameFr: "Pizza Poulet Et Champignons",
            nameAr: "بيتزا الدجاج والفطر",
            descriptionAr: "دجاج - موزاريلا - كريم فريش - الفطر",
            price: 35,
            priceLarge: 50,
          },
          {
            nameFr: "Pizza Shawarma",
            nameAr: "بيتزا شاورما",
            descriptionAr:
              "شاورما - موزاريلا - صلصة طماطم - فلفل - زيتون - الفطر",
            price: 35,
            priceLarge: 50,
          },
          {
            nameFr: "Pizza Viande Hachée",
            nameAr: "بيتزا اللحم المفروم",
            descriptionAr: "كفتة - موزاريلا - صلصة طماطم - فلفل - زيتون",
            price: 35,
            priceLarge: 55,
          },
          {
            nameFr: "Pizza Fruits De Mer",
            nameAr: "بيتزا فواكه البحر",
            descriptionAr: "فواكه البحر - موزاريلا - صلصة طماطم - الفطر",
            price: 45,
            priceLarge: 60,
          },
          {
            nameFr: "Pizza 4 Saisons",
            nameAr: "بيتزا الفصول الأربعة",
            descriptionAr:
              "دجاج - كفتة - فواكه البحر - التونة - موزاريلا - صلصة طماطم",
            price: 45,
            priceLarge: 60,
          },
          {
            nameFr: "Pizza Moitié-Moitié",
            nameAr: "بيتزا نصف بنصف",
            descriptionAr: "حسب الاختيار",
            price: 40,
            priceLarge: 60,
          },
          {
            nameFr: "Pizza Pepperoni",
            nameAr: "بيتزا ببروني",
            descriptionAr: "ببروني - موزاريلا - صلصة طماطم",
            price: 40,
            priceLarge: 60,
          },
          {
            nameFr: "Pizza Burrata Pesto",
            nameAr: "بيتزا بوراتا بيستو",
            descriptionAr: "جبن البوراتا - صلصة بيستو - موزاريلا",
            price: 55,
            priceLarge: 75,
          },
          {
            nameFr: "Pizza Royal",
            nameAr: "بيتزا رويال",
            descriptionAr: "دجاج - كفتة - فواكه البحر - موزاريلا - صلصة طماطم",
            price: 50,
            priceLarge: 65,
          },
        ],
      },
      {
        nameAr: "باستيتشو",
        nameFr: "Pasticcio",
        items: [
          {
            nameFr: "Pasticcio Poulet",
            nameAr: "باستيتشو بالدجاج",
            descriptionAr: "دجاج - فروماج - صوص خاصة - فريت",
            price: 35,
          },
          {
            nameFr: "Pasticcio Viande Hachée",
            nameAr: "باستيتشو باللحم المفروم",
            descriptionAr: "كفتة - فروماج - صوص خاصة - فريت",
            price: 35,
          },
          {
            nameFr: "Pasticcio Mixte",
            nameAr: "باستيتشو مشكل",
            descriptionAr: "دجاج و كفتة - فروماج - صوص خاصة - فريت",
            price: 40,
          },
          {
            nameFr: "Pasticcio Fruits De Mer",
            nameAr: "باستيتشو فواكه البحر",
            descriptionAr: "فواكه البحر - فروماج - صوص خاصة - فريت",
            price: 45,
          },
          {
            nameFr: "Pasticcio Nuggets",
            nameAr: "باستيتشو نوكيت",
            descriptionAr: "دجاج مقرمش - صوص خاصة - فريت - فروماج",
            price: 40,
          },
          {
            nameFr: "Pasticcio Cordon bleu",
            nameAr: "باستيتشو كوردون بلو",
            descriptionAr: "كوردون بلو - فريت - فروماج",
            price: 40,
          },
          {
            nameFr: "Pasticcio Sindibad",
            nameAr: "باستيتشو سندباد",
            descriptionAr:
              "دجاج و كفتة - فواكه البحر - صوص خاصة - فريت - فروماج",
            price: 50,
          },
        ],
      },
      {
        nameAr: "أرانشيني",
        nameFr: "Arancini",
        items: [
          {
            nameFr: "Arancini Gambas",
            nameAr: "أرانشيني بالقيمرون",
            descriptionAr:
              "كرات رز إيطالية محشوة بالجبن والقيمرون، مغطاة بطبقة مقرمشة، تجربة متوسطية فاخرة",
            price: 45,
          },
          {
            nameFr: "Arancini Poulet",
            nameAr: "أرانشيني بالدجاج",
            descriptionAr:
              "كرات رز إيطالية محشوة بالجبن والدجاج، مغطاة بطبقة مقرمشة، تجربة متوسطية فاخرة",
            price: 40,
          },
        ],
      },
      {
        nameAr: "المعكرونة",
        nameFr: "Les Pâtes",
        items: [
          {
            nameFr: "Bolognaise",
            nameAr: "بولونيز",
            descriptionAr: "كفتة - صلصة طماطم - الريحان - بارميزان",
            price: 40,
          },
          {
            nameFr: "Poulet Champignon",
            nameAr: "دجاج بالفطر",
            descriptionAr: "دجاج - كريم فريش - فطر - بارميزان",
            price: 45,
          },
          {
            nameFr: "Fruits de mer",
            nameAr: "فواكه البحر",
            descriptionAr: "فواكه البحر - كريم فريش - بارميزان",
            price: 50,
          },
          {
            nameFr: "Pesto gambas",
            nameAr: "بيستو بالقيمرون",
            descriptionAr: "صلصة بيستو - قيمرون - بارميزان",
            price: 55,
          },
        ],
      },
      {
        nameAr: "ريزوتو",
        nameFr: "Les Risottos",
        items: [
          {
            nameFr: "Fruits De Mer",
            nameAr: "فواكه البحر",
            descriptionAr: "رز - فواكه البحر - فطر - بارميزان",
            price: 55,
          },
          {
            nameFr: "Poulet Champignon",
            nameAr: "دجاج بالفطر",
            descriptionAr: "دجاج - كريم فريش - فطر - بارميزان",
            price: 50,
          },
          {
            nameFr: "Gambas",
            nameAr: "قيمرون",
            descriptionAr: "قيمرون - كريم فريش - فطر - بارميزان",
            price: 60,
          },
        ],
      },
    ],
  },
  {
    nameAr: "وجبات سريعة",
    nameFr: "C'est rapide !!!",
    categories: [
      {
        nameAr: "تاكوس",
        nameFr: "Tacos",
        items: [
          {
            nameFr: "Poulet",
            nameAr: "دجاج",
            descriptionAr: "دجاج - فروماج - فريت - صوص",
            price: 35,
          },
          {
            nameFr: "Viande Hachée",
            nameAr: "لحم مفروم",
            descriptionAr: "كفتة - فروماج - فريت - صوص",
            price: 35,
          },
          {
            nameFr: "Mixte",
            nameAr: "مشكل",
            descriptionAr: "كفتة - دجاج - فروماج - فريت - صوص",
            price: 35,
          },
          {
            nameFr: "Sindibad",
            nameAr: "سندباد",
            descriptionAr: "طاكوس بطبقة خارجية مقرمشة - فروماج - فريت - صوص",
            price: 45,
          },
          {
            nameFr: "Fruits De Mer",
            nameAr: "فواكه البحر",
            descriptionAr: "فواكه البحر - فروماج - فريت - صوص",
            price: 45,
          },
          {
            nameFr: "Shawarma",
            nameAr: "شاورما",
            descriptionAr: "شاورما - فروماج - فريت - صوص",
            price: 35,
          },
          {
            nameFr: "Cordon Bleu",
            nameAr: "كوردون بلو",
            descriptionAr: "كوردون بلو - فروماج - فريت - صوص",
            price: 38,
          },
          {
            nameFr: "Nuggets",
            nameAr: "نوكيت",
            descriptionAr: "نوكيت - فروماج - فريت - صوص",
            price: 40,
          },
        ],
      },
      {
        nameAr: "برغر",
        nameFr: "Burger",
        items: [
          {
            nameFr: "Chicken Burger",
            nameAr: "برغر دجاج",
            descriptionAr: "دجاج - فروماج - فريت - صوص",
            price: 35,
          },
          {
            nameFr: "Cheese Burger",
            nameAr: "تشيز برغر",
            descriptionAr: "كفتة - فروماج - فريت - صوص",
            price: 35,
          },
          {
            nameFr: "American Burger",
            nameAr: "أمريكان برغر",
            descriptionAr: "كفتة - دجاج - فروماج - فريت - صوص",
            price: 40,
          },
          {
            nameFr: "Double Cheese Burger",
            nameAr: "دبل تشيز برغر",
            descriptionAr: "قطعتين من الكفتة - فروماج - فريت - صوص",
            price: 55,
          },
          {
            nameFr: "Double Chicken Burger",
            nameAr: "دبل تشيكن برغر",
            descriptionAr: "قطعتين من الدجاج - فروماج - فريت - صوص",
            price: 50,
          },
          {
            nameFr: "Mexican Burger",
            nameAr: "مكسيكان برغر",
            descriptionAr: "دجاج و كفتة - فروماج - فريت - صوص",
            price: 45,
          },
        ],
      },
      {
        nameAr: "راب",
        nameFr: "Wrap",
        items: [
          {
            nameFr: "Wrap Poulet",
            nameAr: "راب بالدجاج",
            descriptionAr: "دجاج - أفوكادو - بصل - طماطم - جبنة - صوص خاص",
            price: 38,
          },
          {
            nameFr: "Wrap César",
            nameAr: "راب سيزار",
            descriptionAr: "دجاج مقلي - أفوكادو - طماطم - بصل - جبنة - صوص خاص",
            price: 40,
          },
        ],
      },
      {
        nameAr: "شاورما",
        nameFr: "Shawarma",
        items: [
          {
            nameFr: "Shawarma Bœuf",
            nameAr: "شاورما اللحم",
            descriptionAr: "شاورما لحم في الخبز اللبناني مع سلطة وصلصة",
            comingSoon: true,
          },
          {
            nameFr: "Shawarma Mixte",
            nameAr: "شاورما مشكلة",
            descriptionAr: "شاورما الدجاج واللحم ملفوفة مع سلطة وصلصة",
            comingSoon: true,
          },
          {
            nameFr: "Shawarma 3ich",
            nameAr: "شاورما عيش",
            descriptionAr: "شاورما الدجاج في الخبز اللبناني مع سلطة وصلصة",
            price: 23,
          },
          {
            nameFr: "Shawarma Sindibad",
            nameAr: "شاورما سندباد",
            descriptionAr: "شاورما الدجاج ملفوفة مع سلطة وصلصة",
            price: 40,
          },
        ],
      },
    ],
  },
  {
    nameAr: "لا تفوّت الصحة",
    nameFr: "Stay Healthy",
    categories: [
      {
        nameAr: "سمك، لحم ودواجن",
        nameFr: "Fish, Meat & Poultry",
        items: [
          {
            nameFr: "Suprême Poulet",
            nameAr: "سوبريم دجاج",
            descriptionAr: "صدر دجاج - صلصة كريمة خاصة",
            price: 60,
          },
          {
            nameFr: "Émincé Poulet",
            nameAr: "إمينسيه دجاج",
            descriptionAr:
              "شرائح دجاج رفيعة متبلة - ثوم - بصل - صلصة كريمة خاصة",
            price: 50,
          },
          {
            nameFr: "Émincé Bœuf",
            nameAr: "إمينسيه لحم",
            descriptionAr: "شرائح لحم بقر رفيعة - صلصة كريمة خاصة",
            price: 75,
          },
          {
            nameFr: "Poulet Parmesan",
            nameAr: "دجاج بارميزان",
            descriptionAr: "صدر دجاج يقدم مع باستا",
            price: 65,
          },
          {
            nameFr: "Ballotine Gourmande",
            nameAr: "بالوتين غورماند",
            descriptionAr:
              "دجاج محشي (جبن - فطر) ملفوف على شكل رول، يقدم مع صوص كريمي بالفطر",
            price: 70,
          },
          {
            nameFr: "Chicken Crispy",
            nameAr: "تشيكن كريسبي",
            descriptionAr: "قطع صدر الدجاج المقرمشة مع صلصة الكريسبي الخاصة",
            price: 50,
          },
          {
            nameFr: "Plat Shawarma Bœuf",
            nameAr: "طبق شاورما اللحم",
            descriptionAr: "طبق شاورما لحم مع المخللات وصلصات خاصة",
            price: 50,
          },
          {
            nameFr: "Plat Shawarma Poulet",
            nameAr: "طبق شاورما الدجاج",
            descriptionAr: "طبق شاورما دجاج مع المخللات وصلصات خاصة",
            price: 40,
          },
        ],
      },
      {
        nameAr: "الأطباق المميزة",
        nameFr: "Les Incontournables",
        items: [
          {
            nameFr: "Entrecôte De Bœuf",
            nameAr: "أونتركوت لحم",
            descriptionAr: "ريب اللحم مشوي - زبدة أعشاب",
            price: 80,
          },
          {
            nameFr: "Pavé de Saumon",
            nameAr: "قطعة سلمون",
            descriptionAr: "قطعة سلمون - ليمون - أعشاب",
            price: 90,
          },
          {
            nameFr: "Pavé d'Espadon",
            nameAr: "قطعة سمك أبو سيف",
            descriptionAr: "قطعة سمك مشوي - زيت زيتون - ليمون - أعشاب",
            price: 70,
          },
          {
            nameFr: "Chich Taouk De Poulet",
            nameAr: "شيش طاووق دجاج",
            descriptionAr: "أسياخ دجاج - بهارات شرقية",
            price: 50,
          },
          {
            nameFr: "Brochette Mixte",
            nameAr: "بروشيت مشكلة",
            descriptionAr: "أسياخ مشكلة: دجاج - لحم (حسب المطبخ)",
            price: 50,
          },
          {
            nameFr: "Buffalo au Miel",
            nameAr: "بوفالو بالعسل",
            descriptionAr: "قطع الدجاج المقرمشة مع صلصة العسل المميزة",
            price: 50,
          },
          {
            nameFr: "Poitrine Poulet au Miel",
            nameAr: "صدر دجاج بالعسل",
            descriptionAr: "صدر الدجاج مع صلصة العسل",
            price: 60,
          },
          {
            nameFr: "Cordon Bleu",
            nameAr: "كوردون بلو",
            descriptionAr:
              "صدر دجاج محشي بالجبن والديك الرومي المدخن مع صلصة كريمية خاصة",
            price: 65,
          },
        ],
      },
      {
        nameAr: "إضافات",
        nameFr: "Garnitures & Extras",
        items: [
          {
            nameFr: "Pommes Frites Belgique",
            nameAr: "بطاطا مقلية بلجيكية",
            price: 10,
          },
          { nameFr: "Gratin Macaroni", nameAr: "غراتان معكرونة", price: 10 },
          {
            nameFr: "Purée de Pomme de Terre Classique",
            nameAr: "بوريه البطاطا الكلاسيكي",
            price: 10,
          },
          { nameFr: "Légumes Sautés", nameAr: "خضار سوتيه", price: 10 },
          {
            nameFr: "Risotto aux champignons",
            nameAr: "ريزوتو بالفطر",
            price: 25,
          },
          {
            nameFr: "Spaghetti à la Sauce Tomate",
            nameAr: "سباغيتي بصلصة الطماطم",
            price: 25,
          },
          {
            nameFr: "Spaghetti à la Crème de Truffe",
            nameAr: "سباغيتي بكريمة الكمأة",
            price: 25,
          },
        ],
      },
    ],
  },
  {
    nameAr: "ألوان محلية",
    nameFr: "Couleurs locales..!",
    categories: [
      {
        nameAr: "أطباق مغربية",
        nameFr: "Spécialités Marocaines",
        items: [
          {
            nameFr: "Tajine Poulet à la Deghmira",
            nameAr: "طاجين الدجاج بالدغميرة",
            noteAr: "كل يوم اثنين",
            noteFr: "Tous les lundis",
            descriptionAr:
              "طاجين مغربي أصيل بالدجاج، بصلصة الدغميرة التقليدية والتوابل",
            price: 40,
          },
          {
            nameFr: "Tajine Bœuf Aux Pruneaux",
            nameAr: "طاجين اللحم بالبرقوق",
            noteAr: "كل يوم ثلاثاء",
            noteFr: "Tous les mardis",
            descriptionAr:
              "طاجين لحم بقر مع البرقوق واللوز وقليل من القرفة، يجمع النكهات الحلوة والمالحة",
            price: 50,
          },
          {
            nameFr: "Pastilla De Poulet",
            nameAr: "بسطيلة الدجاج",
            noteAr: "كل يوم أربعاء",
            noteFr: "Tous les mercredis",
            descriptionAr:
              "بسطيلة مغربية كلاسيكية تجمع بين رقة أوراق البسطيلة وقرمشتها وحشوة الدجاج المعطرة بالتوابل واللوز",
            price: 45,
          },
          {
            nameFr: "Pastilla Fruits de mer",
            nameAr: "بسطيلة فواكه البحر",
            noteAr: "كل يوم خميس",
            noteFr: "Tous les jeudis",
            descriptionAr:
              "بسطيلة فاخرة محشوة بمزيج من فواكه البحر والشعرية، تجربة راقية لمحبي المأكولات البحرية",
            price: 60,
          },
          {
            nameFr: "Poulet Portugais (coquelet)",
            nameAr: "دجاج برتغالي",
            noteAr: "كل يوم",
            noteFr: "Tous les jours",
            descriptionAr:
              "دجاج صغير مشوي بعناية ليكون طرياً من الداخل ومقرمشاً من الخارج، بتتبيلة مغربية",
            price: 30,
          },
          {
            nameFr: "Poulet Au Four",
            nameAr: "دجاج مشوي بالفرن",
            noteAr: "كل يوم",
            noteFr: "Tous les jours",
            descriptionAr:
              "طبق دجاج محمر في الفرن على الطريقة المنزلية مع نكهات مغربية وأعشاب عطرية",
            price: 40,
          },
        ],
      },
      {
        nameAr: "كسكس مغربي",
        nameFr: "Couscous Marocain",
        items: [
          {
            nameFr: "Couscous poulet",
            nameAr: "كسكس بالدجاج",
            descriptionAr: "كسكس دجاج بالخضر أو بالتفاية حسب الذوق",
            price: 35,
          },
          {
            nameFr: "Couscous viande",
            nameAr: "كسكس باللحم",
            descriptionAr: "كسكس باللحم بالخضر أو بالتفاية حسب الذوق",
            price: 40,
          },
        ],
      },
    ],
  },
  {
    nameAr: "أفضل ختام",
    nameFr: "La meilleure fin..!!!",
    categories: [
      {
        nameAr: "الحلويات",
        nameFr: "Desserts",
        items: [
          {
            nameFr: "Hala Khachkhach",
            nameAr: "حلى خشخاش",
            descriptionAr: "تحلية مغربية فاخرة بقرمشة ذهبية رقيقة مع عدة نكهات",
            price: 15,
          },
          {
            nameFr: "Panna Cotta",
            nameAr: "بانا كوتا",
            descriptionAr:
              "كريمة إيطالية ناعمة بقوام مخملي، تُقدّم مع صوص فواكه",
            price: 20,
          },
          {
            nameFr: "Crème Brûlée",
            nameAr: "كريم بروليه",
            descriptionAr:
              "كريمة فانيلا فاخرة بسطح كراميل، تذوب النكهات فيها بتناغم مميز",
            price: 25,
          },
          {
            nameFr: "San Sebastian",
            nameAr: "سان سيباستيان",
            descriptionAr: "تشيزكيك إسباني بقوام كريمي مع لمسة من الشوكولا",
            price: 35,
          },
          {
            nameFr: "Jawhara Sindibad",
            nameAr: "جوهرة سندباد",
            descriptionAr:
              "طبقات رقيقة من العجين المقرمش محشوة بكريمة معطرة باللوز، بلمسة شرقية",
            price: 25,
          },
          {
            nameFr: "Tiramisu",
            nameAr: "تيراميسو",
            descriptionAr:
              "حلوى إيطالية من بسكويت بالقهوة وكريمة الماسكاربوني والكاكاو",
            price: 27,
          },
          {
            nameFr: "Chocolat Fondu",
            nameAr: "شوكولاتة فوندو",
            descriptionAr: "حلوى شوكولاتة بقلب سائل، تُقدّم مع آيس كريم",
            price: 28,
          },
        ],
      },
      {
        nameAr: "سيندي تروبي",
        nameFr: "SindiTropi..!!",
        items: [
          {
            nameFr: "Royal Tropical Mix",
            nameAr: "رويال تروبيكال ميكس",
            descriptionAr: "مانجو / أناناس / برتقال",
            price: 25,
          },
          {
            nameFr: "Avocado Gold Smoothie",
            nameAr: "أفوكادو غولد سموذي",
            descriptionAr: "أفوكادو / زبدة الفول السوداني / مكسرات / عسل",
            price: 27,
          },
          {
            nameFr: "Jus des Jardins Marocains",
            nameAr: "عصير حدائق مغربية",
            descriptionAr: "مزيج من الفواكه الموسمية المتاحة",
            price: 23,
          },
          {
            nameFr: "Choco-Banane Deluxe",
            nameAr: "شوكو بنان ديلوكس",
            descriptionAr: "موز / مسحوق شوكولا / فانيلا / زبدة فول سوداني / عسل",
            price: 25,
          },
          {
            nameFr: "Smoothie des Sages",
            nameAr: "سموذي الحكماء",
            descriptionAr: "مانجو / دراغون فروت / أناناس / غرولا / برتقال / عسل",
            price: 28,
          },
          {
            nameFr: "Ananas Fresh Boost",
            nameAr: "أناناس فريش بوست",
            descriptionAr: "أناناس / برتقال",
            price: 28,
          },
        ],
      },
    ],
  },
];

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`Admin user ready: ${email}`);

  await prisma.feedback.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();
  await prisma.menuSection.deleteMany();

  for (let s = 0; s < menu.length; s++) {
    const section = menu[s];
    const createdSection = await prisma.menuSection.create({
      data: { nameAr: section.nameAr, nameFr: section.nameFr, sortOrder: s },
    });

    for (let c = 0; c < section.categories.length; c++) {
      const category = section.categories[c];
      const createdCategory = await prisma.menuCategory.create({
        data: {
          sectionId: createdSection.id,
          nameAr: category.nameAr,
          nameFr: category.nameFr,
          sortOrder: c,
        },
      });

      for (let i = 0; i < category.items.length; i++) {
        const item = category.items[i];
        await prisma.menuItem.create({
          data: {
            categoryId: createdCategory.id,
            nameAr: item.nameAr,
            nameFr: item.nameFr,
            descriptionAr: item.descriptionAr,
            descriptionFr: item.descriptionFr,
            noteAr: item.noteAr,
            noteFr: item.noteFr,
            price: item.price,
            priceLarge: item.priceLarge,
            comingSoon: item.comingSoon ?? false,
            sortOrder: i,
          },
        });
      }
    }
  }

  console.log("Menu seeded: Sindibad full menu");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
