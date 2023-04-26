export const getCsrfToken = (html) => {
  const startPoint = '<meta name="csrftoken" content="';
  const startIndex = html.indexOf(startPoint) + startPoint.length;
  const endIndex = html.indexOf('"/>', startIndex);
  const token = html.slice(startIndex, endIndex);
  return token.trim();
};

export const filterFilesByDates = (data) => {
  let priceFullDate = "";
  let promoFullDate = "";
  // todo: verify data is sorted from server of rami , if not sorted add
  // data.sort((a, b) => new Date(b.time) - new Date(a.time)).filter...
  return data.filter((file) => {
    if (file.fname.split("-")[1] !== "039") return false;

    if (file.fname.startsWith("PriceFull")) {
      if (priceFullDate === "") priceFullDate = new Date(file.time);
      else if (priceFullDate !== "" && new Date(file.time) > priceFullDate) priceFullDate = new Date(file.time);
    } else if (file.fname.startsWith("PromoFull")) {
      if (promoFullDate === "") promoFullDate = new Date(file.time);
      else if (promoFullDate !== "" && new Date(file.time) > promoFullDate) promoFullDate = new Date(file.time);
    }

    if (file.fname.startsWith("Price") && new Date(file.time) < priceFullDate) {
      return false;
    } else if (file.fname.startsWith("Promo") && new Date(file.time) < promoFullDate) {
      return false;
    }
    return true;
  });
};
