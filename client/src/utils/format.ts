export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
};
