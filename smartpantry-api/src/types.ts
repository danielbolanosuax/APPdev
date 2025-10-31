export type Dietary = {
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  lactoseFree?: boolean;
  nutFree?: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  ingredients: string[];
  steps: string[];
  time_minutes: number;
  servings: number;
  allergens?: string[];
  tags?: string[];
};

export type SuggestRequest = {
  pantry: string[];
  servings?: number;
  dietary?: Dietary;
};

export type SuggestResponse = {
  persona: "chef-cercano";
  recipes: Array<{
    id: string;
    title: string;
    reason: string;
    ingredients_needed: string[];
    substitutions: string[];
    steps: string[];
    time_minutes: number;
    servings: number;
    warnings: string[];
    tips: string[];
  }>;
};
