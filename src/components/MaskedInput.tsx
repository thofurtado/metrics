// src/components/MaskedInput.tsx
import React, { InputHTMLAttributes } from 'react';
import MaskInput from 'react-input-mask'; // Importa a biblioteca
import { Input } from '@/components/ui/input'; // Seu componente Input

// Define o tipo das propriedades, incluindo o `mask`
interface MaskedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  mask: string | Array<string | RegExp>;
}

// Componente que renderiza o Input com a máscara
const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, ...props }, ref) => {
    return (
      <MaskInput mask={mask} onChange={onChange} {...props}>
        {(inputProps) => <Input {...inputProps} ref={ref} />}
      </MaskInput>
    );
  }
);
MaskedInput.displayName = 'MaskedInput';

export default MaskedInput;