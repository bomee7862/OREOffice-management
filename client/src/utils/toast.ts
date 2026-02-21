import toast from 'react-hot-toast';

export const showSuccess = (msg: string) => toast.success(msg);
export const showError = (msg: string) => toast.error(msg);
export const showInfo = (msg: string) => toast(msg, { icon: 'ℹ️' });
export const showDetailedSuccess = (lines: string[]) =>
  toast.success(lines.join('\n'), { duration: 5000, style: { whiteSpace: 'pre-line' } });
