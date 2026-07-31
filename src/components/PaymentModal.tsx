import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { X, Phone, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onDormant?: () => void;
  onPaid: () => void | Promise<void>;
  amount: number;
  momoCode: string;
  adminPhone: string;
  title?: string;
  allowDormant?: boolean;
}

export function PaymentModal({ open, onClose, onDormant, onPaid, amount, momoCode, adminPhone, title, allowDormant }: Props) {
  const { t } = useI18n();
  const [stage, setStage] = useState<"pay" | "confirm">("pay");
  const [loading, setLoading] = useState(false);
  if (!open) return null;

  const fullCode = `${momoCode}*${amount}#`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-md rounded-2xl bg-card text-card-foreground shadow-elegant p-6 relative animate-scale-in">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-md hover:bg-accent">
          <X className="w-5 h-5" />
        </button>
        {stage === "pay" ? (
          <>
            <h3 className="text-xl font-bold mb-1">{title ?? t("pay.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("pay.instructions")}</p>
            <div className="rounded-xl gradient-hero p-6 text-center shadow-glow mb-4">
              <div className="text-xs uppercase tracking-widest text-primary-foreground/80">{t("pay.amount")}</div>
              <div className="text-3xl font-bold text-primary-foreground mt-1">{amount.toLocaleString()} RWF</div>
              <div className="mt-3 text-lg font-mono text-primary-foreground tracking-wide bg-black/20 rounded-lg py-2">{fullCode}</div>
            </div>
            <div className="flex gap-2">
              {allowDormant && onDormant && (
                <button
                  onClick={onDormant}
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-accent transition"
                >{t("pay.dormant")}</button>
              )}
              <button
                onClick={() => setStage("confirm")}
                className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg gradient-hero text-primary-foreground shadow-elegant hover:opacity-90 transition"
              >{t("pay.paid")}</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold mb-1">{t("pay.confirmtitle")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("pay.confirmbody")}</p>
            <div className="rounded-xl bg-accent p-4 mb-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t("pay.admincontact")}</div>
                <div className="font-bold">{adminPhone}</div>
              </div>
            </div>
            <button
              disabled={loading}
              onClick={async () => { setLoading(true); await onPaid(); setLoading(false); onClose(); }}
              className="w-full px-4 py-2.5 text-sm font-medium rounded-lg gradient-hero text-primary-foreground shadow-elegant hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> {t("pay.paid")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
