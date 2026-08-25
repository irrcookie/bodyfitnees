/** Classify a meal for 減脂：高蛋白＝綠，高脂／膽固醇＝黃，均衡＝無色。 */

function shareFor(rec, nutrition) {
  return nutrition?.meals?.find((m) => m.id === rec?.meal)?.kcalShare ?? 0.3;
}

export function mealHealth(rec, nutrition = {}) {
  if (!rec) return { tone: "ok", label: "均衡", className: "" };
  const share = shareFor(rec, nutrition);
  const fatBudget = (nutrition.fatG ?? 70) * share;
  const cholBudget = (nutrition.cholesterolMg ?? 300) * share;
  const proteinBudget = (nutrition.proteinG ?? 160) * share;
  const fat = Number(rec.totalFatG) || 0;
  const chol = Number(rec.totalCholesterolMg) || 0;
  const protein = Number(rec.totalProteinG) || 0;
  const kcal = Number(rec.totalKcal) || 0;
  const hasMacros = rec.totalFatG != null || rec.totalCholesterolMg != null || rec.totalProteinG != null;
  if (!hasMacros) return { tone: "ok", label: "均衡", className: "" };

  const highFat = fat > fatBudget * 1.2 || (kcal > 0 && (fat * 9) / kcal > 0.4);
  const highChol = rec.totalCholesterolMg != null && chol > cholBudget * 1.2;
  if (highFat || highChol) {
    return { tone: "warn", label: "高脂／膽固醇", className: "meal-card-warn" };
  }

  const highProtein = protein >= proteinBudget * 0.85 || (kcal > 0 && (protein * 4) / kcal >= 0.28);
  if (highProtein) {
    return { tone: "good", label: "高蛋白", className: "meal-card-good" };
  }

  return { tone: "ok", label: "均衡", className: "" };
}
