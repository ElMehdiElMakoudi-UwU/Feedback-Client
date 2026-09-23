export type AdminMenuOption = {
  id: string;
  nameFr: string;
  nameAr: string;
  priceDelta: number;
  available: boolean;
};

export type AdminMenuOptionGroup = {
  id: string;
  nameFr: string;
  nameAr: string;
  required: boolean;
  maxSelect: number;
  options: AdminMenuOption[];
};

export type AdminMenuItem = {
  id: string;
  categoryId: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string | null;
  descriptionAr: string | null;
  noteFr: string | null;
  noteAr: string | null;
  price: number | null;
  priceLarge: number | null;
  comingSoon: boolean;
  available: boolean;
  photoUrl: string | null;
  optionGroups: AdminMenuOptionGroup[];
};

export type AdminMenuCategory = {
  id: string;
  sectionId: string;
  nameFr: string;
  nameAr: string;
  items: AdminMenuItem[];
};

export type AdminMenuSection = {
  id: string;
  nameFr: string;
  nameAr: string;
  categories: AdminMenuCategory[];
};

// For "move to…" selects.
export type CategoryChoice = { id: string; label: string };
