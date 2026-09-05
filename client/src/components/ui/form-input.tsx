import type { FieldError as HookFormFieldError } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormInputProps = React.ComponentProps<typeof Input> & {
  label: string;
  error?: HookFormFieldError;
};

export function FormInput({ id, label, error, ...props }: FormInputProps) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} aria-invalid={!!error} {...props} />
      <FieldError errors={[error]} />
    </Field>
  );
}
