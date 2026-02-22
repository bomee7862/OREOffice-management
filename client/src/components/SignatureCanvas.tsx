import { useRef, useState } from 'react';
import SignaturePad from 'react-signature-canvas';
import { Eraser, Check, Upload } from 'lucide-react';

interface SignatureCanvasProps {
  onSave: (signatureData: string) => void;
  readOnly?: boolean;
  existingSignature?: string;
}

export default function SignatureCanvas({ onSave, readOnly, existingSignature }: SignatureCanvasProps) {
  const sigPadRef = useRef<SignaturePad>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    setUploadedImage(null);
  };

  const handleSave = () => {
    if (mode === 'upload' && uploadedImage) {
      onSave(uploadedImage);
      return;
    }
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedImage(dataUrl);
      setIsEmpty(false);
    };
    reader.readAsDataURL(file);
  };

  if (readOnly && existingSignature) {
    return (
      <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
        <img src={existingSignature} alt="서명" className="max-h-24 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 모드 선택 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setMode('draw'); setUploadedImage(null); }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'draw' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          직접 서명
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'upload' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          이미지 업로드
        </button>
      </div>

      {mode === 'draw' ? (
        <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white">
          <SignaturePad
            ref={sigPadRef}
            canvasProps={{
              className: 'w-full',
              style: { width: '100%', height: '160px' },
            }}
            onEnd={() => setIsEmpty(false)}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 rounded-lg bg-white p-4">
          {uploadedImage ? (
            <img src={uploadedImage} alt="업로드된 서명" className="max-h-32 mx-auto" />
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 text-center text-slate-500 hover:text-slate-700"
            >
              <Upload className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">클릭하여 서명/도장 이미지 업로드</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG 파일</p>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <Eraser className="w-4 h-4" />
          지우기
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isEmpty && !uploadedImage}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check className="w-4 h-4" />
          서명 확인
        </button>
      </div>
    </div>
  );
}
