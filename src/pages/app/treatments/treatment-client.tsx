import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FilePen } from 'lucide-react'
import React from 'react'
import { useForm } from 'react-hook-form'
import MaskInput from 'react-input-mask'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { createClient } from '@/api/create-client'
import { Button } from '@/components/ui/button'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

// ====================================================================
// PARTE 1: UTILS E FUNÇÕES AUXILIARES (VALIDAÇÃO E MÁSCARA)
// ====================================================================

/**
 * Função para remover caracteres não numéricos.
 */
const cleanNumber = (value: string | undefined | null): string => {
    return (value || '').replace(/\D/g, '');
};

// ----------------------------------------
// FUNÇÕES DE VALIDAÇÃO ROBUSTA (DÍGITO VERIFICADOR)
// (Mantidas pois são a base da validação Zod)
// ----------------------------------------

const isValidCpf = (cpf: string): boolean => {
    const cleaned = cleanNumber(cpf);
    if (cleaned.length !== 11 || /^(\d)\1{10}$/.test(cleaned)) return false;
    let sum, rest;
    sum = 0;
    for (let i = 1; i <= 9; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if ((rest == 10) || (rest == 11)) rest = 0;
    if (rest != parseInt(cleaned.substring(9, 10))) return false;
    sum = 0;
    for (let i = 1; i <= 10; i++) sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    rest = (sum * 10) % 11;
    if ((rest == 10) || (rest == 11)) rest = 0;
    return rest == parseInt(cleaned.substring(10, 11));
};

const isValidCnpj = (cnpj: string): boolean => {
    const cleaned = cleanNumber(cnpj);
    if (cleaned.length !== 14 || /^(\d)\1{13}$/.test(cleaned)) return false;
    let length = cleaned.length - 2;
    let numbers = cleaned.substring(0, length);
    let digits = cleaned.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != parseInt(digits.charAt(0))) return false;

    length = length + 1;
    numbers = cleaned.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    return result == parseInt(digits.charAt(1));
};

// Componente MaskedInput
interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mask: string | Array<string | RegExp>;
}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, onChange, onBlur, value, className, ...props }, ref) => {
    return (
      <MaskInput
        mask={mask}
        onChange={onChange}
        onBlur={onBlur}
        value={value}
        {...props}
      >
        {(inputProps: any) => <Input {...inputProps} ref={ref} className={className} />}
      </MaskInput>
    );
  }
);
MaskedInput.displayName = 'MaskedInput';


// ====================================================================
// PARTE 2: ZOD SCHEMA
// ====================================================================

const formSchema = z.object({
  name: z.string().min(1, 'O nome do cliente é obrigatório.'),
  
  identification: z.string().nullish().or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      const cleaned = cleanNumber(val);
      if (cleaned.length === 11) return isValidCpf(val);
      if (cleaned.length === 14) return isValidCnpj(val);
      return false; // Força erro se tiver valor e não for CPF/CNPJ válido
    }, {
      message: 'CPF ou CNPJ inválido. Verifique o número.',
    }),

  phone: z.string().nullish().or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      const cleaned = cleanNumber(val);
      // DD + 8 dígitos (10 total) ou DD + 9 dígitos (11 total)
      return cleaned.length === 10 || cleaned.length === 11; 
    }, {
      message: 'Telefone inválido (necessita DDD e 8 ou 9 dígitos).',
    }),

  email: z.string().nullish().or(z.literal(''))
    .refine((val) => {
      if (!val) return true;
      return z.string().email().safeParse(val).success;
    }, {
      message: 'E-mail em formato inválido.',
    }),
      
  contract: z.boolean().nullish(),
})

type FormSchemaType = z.infer<typeof formSchema>

interface TreatmentClientProps {
  open: boolean;
}

// ====================================================================
// PARTE 3: COMPONENTE PRINCIPAL TreatmentClient
// ====================================================================

export function TreatmentClient({ open }: TreatmentClientProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutateAsync: client } = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente cadastrado com sucesso', {
        position: 'top-center',
      })
      setTimeout(() => {
        navigate(window.location.pathname)
      }, 1000)
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar cliente', {
        position: 'top-center',
      })
    }
  })

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        name: '',
        identification: '',
        phone: '',
        email: '',
        contract: false,
    },
    mode: 'onBlur', // FORÇA A VALIDAÇÃO AO SAIR DO CAMPO para feedback rápido
  })

  const identificationValue = form.watch('identification');
  const phoneValue = form.watch('phone');
  const errors = form.formState.errors; // Simplifica o acesso aos erros

  // Determina a máscara do CPF/CNPJ dinamicamente
  const getIdentificationMask = (value: string | undefined | null) => {
    const cleaned = cleanNumber(value);
    if (cleaned.length <= 11) {
      return '999.999.999-99'; 
    }
    return '99.999.999/9999-99';
  };

  // 1. CORREÇÃO: Máscara de Telefone Prioriza o Celular (11 dígitos)
  const getPhoneMask = (value: string | undefined | null) => {
    const cleaned = cleanNumber(value);
    // Se digitou mais de 10 dígitos, ou se o nono dígito foi ativado
    if (cleaned.length > 10 || cleaned[2] === '9') { 
      return '(99) 99999-9999'; 
    }
    // Padrão Fixo/Celular Antigo
    return '(99) 9999-9999';
  };

  async function onSubmit(data: FormSchemaType) {
    // Limpa os dados antes de enviar para o backend
    const identificationClean = cleanNumber(data.identification);
    const phoneClean = cleanNumber(data.phone);

    await client({
      name: data.name,
      identification: identificationClean || null,
      phone: phoneClean || null,
      email: data.email || null,
      contract: data.contract ? data.contract : false,
    })
  }

  // 2. FUNÇÃO AUXILIAR PARA CLASSES DE ERRO
  const getErrorClass = (fieldName: keyof FormSchemaType) => {
      return errors[fieldName] ? 'border-red-500 focus-visible:ring-red-500' : '';
  }

  return (
    <DialogContent className="w-720p">
      <DialogHeader>
        <DialogTitle>Cadastro de Cliente</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form
          className="flex flex-col items-start justify-center gap-8"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* ... (Seção Contrato - Mantida) ... */}
          <FormField
            control={form.control}
            name="contract"
            render={({ field }) => (
              <FormItem className="flex w-full flex-row items-center justify-between space-x-4 border-b border-gray-200 pb-4">
                <div className="flex flex-row items-center space-x-2">
                  <FilePen className="h-5 w-5 text-gray-600" />
                  <FormLabel className="font-semibold text-gray-700">
                    Contrato Assinado
                  </FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-minsk-500 data-[state=unchecked]:bg-gray-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />


          {/* CAMPO NOME (OBRIGATÓRIO) */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Nome *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Nome completo ou Razão Social"
                    className={getErrorClass('name')} // Aplica classe de erro
                    value={field.value ?? ''} 
                    {...field} 
                  />
                </FormControl>
                {errors.name && (
                  <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
              </FormItem>
            )}
          />

          {/* CAMPO CPF/CNPJ COM MÁSCARA INTELIGENTE E VALIDAÇÃO */}
          <FormField
            control={form.control}
            name="identification"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">CPF/CNPJ</FormLabel>
                <FormControl>
                  <MaskedInput
                    mask={getIdentificationMask(identificationValue)}
                    maskChar={null}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    className={getErrorClass('identification')} // Aplica classe de erro
                    value={field.value ?? ''}
                    {...field}
                  />
                </FormControl>
                {errors.identification && (
                  <p className="text-sm text-red-500 mt-1">{errors.identification.message}</p>
                )}
              </FormItem>
            )}
          />

          {/* CAMPO E-MAIL COM VALIDAÇÃO DE FORMATO E FEEDBACK VISUAL */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">E-mail</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder="exemplo@dominio.com"
                    className={getErrorClass('email')} // Aplica classe de erro
                    value={field.value ?? ''} 
                    {...field} 
                  />
                </FormControl>
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </FormItem>
            )}
          />

          {/* CAMPO TELEFONE COM MÁSCARA INTELIGENTE E VALIDAÇÃO */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="text-left">Telefone</FormLabel>
                <FormControl>
                  <MaskedInput
                    mask={getPhoneMask(phoneValue)} // Máscara dinâmica CORRIGIDA
                    maskChar={null}
                    placeholder="(00) 90000-0000"
                    className={getErrorClass('phone')} // Aplica classe de erro
                    value={field.value ?? ''}
                    {...field}
                  />
                </FormControl>
                {errors.phone && (
                  <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
                )}
              </FormItem>
            )}
          />

          <div className="flex w-full justify-end">
            <Button
              type="submit"
              className="justify-self-end bg-minsk-400 text-white hover:bg-minsk-500"
            >
              Cadastrar
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  )
}