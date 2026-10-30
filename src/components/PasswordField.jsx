import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/**
 * Shared password field for Login, Register and Reset Password.
 * Layout styles are inline on purpose: the eye stays inside the input
 * even when an older MindTrack styles.css has not been updated.
 */
export default function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  required = false,
  hint,
  hintTone = "neutral"
}) {
  const [visible, setVisible] = useState(false);
  const id = useId();
  const inputId = `mindtrack-password-${id}`;
  const hintId = `${inputId}-hint`;
  const actionLabel = `${visible ? "Hide" : "Show"} ${String(label || "password").toLowerCase()}`;
  const hintColors = {
    neutral: "#5d6678",
    warning: "#986d18",
    success: "#17643b",
    error: "#a42a32"
  };

  return (
    <div className="mindtrack-password-field" style={{ minWidth: 0, textAlign: "left" }}>
      <label
        htmlFor={inputId}
        style={{ display: "block", margin: "18px 0 8px", fontWeight: 600 }}
      >
        {label}
        {required && (
          <span className="required-asterisk" aria-hidden="true">*</span>
        )}
      </label>
      <div
        className="mindtrack-password-control"
        style={{ position: "relative", display: "block", width: "100%" }}
      >
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          aria-describedby={hint ? hintId : undefined}
          style={{
            display: "block",
            width: "100%",
            boxSizing: "border-box",
            paddingRight: 58
          }}
        />
        <button
          type="button"
          className="mindtrack-password-toggle"
          onClick={() => setVisible(current => !current)}
          aria-label={actionLabel}
          aria-pressed={visible}
          title={actionLabel}
          style={{
            position: "absolute",
            top: "50%",
            right: 8,
            transform: "translateY(-50%)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 40,
            height: 40,
            margin: 0,
            padding: 0,
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#536177",
            cursor: "pointer",
            zIndex: 1
          }}
        >
          {visible ? (
            <EyeOff size={20} aria-hidden="true" />
          ) : (
            <Eye size={20} aria-hidden="true" />
          )}
        </button>
      </div>
      {hint && (
        <p
          id={hintId}
          className="mindtrack-password-hint"
          data-tone={hintTone}
          aria-live="polite"
          style={{
            margin: "6px 0 0",
            color: hintColors[hintTone] || hintColors.neutral,
            fontSize: 12,
            fontWeight: 500,
            lineHeight: 1.45
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
