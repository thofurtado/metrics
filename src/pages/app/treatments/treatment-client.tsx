import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FilePen, Building2 } from 'lucide-react'
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
  maskChar?: string | null;
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
  isEnterprise: z.boolean().default(false),
  contact: z.string().optional(),
})
  .superRefine((data, ctx) => {
    if (data.isEnterprise && !data.contact) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O nome do contato é obrigatório para Pessoa Jurídica.",
        path: ["contact"],
      });
    }
  });

type FormSchemaType = z.infer<typeof formSchema>

interface TreatmentClientProps {
  open: boolean;
  onClose: () => void; // ← ADICIONE ESTA PROP
}

// ====================================================================
// PARTE 3: COMPONENTE PRINCIPAL TreatmentClient
// ====================================================================

export function TreatmentClient({ onClose }: TreatmentClientProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutateAsync: client } = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Cliente cadastrado com sucesso', {
        position: 'top-center',
      })

      onClose(); // Fecha o dialog

      setTimeout(() => {
        navigate(window.location.pathname)
      }, 1000)
    },
    onError: () => {
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
      isEnterprise: false,
      contact: '',
    },
    mode: 'onBlur',
  })

  const isEnterpriseValue = form.watch('isEnterprise');
  const phoneValue = form.watch('phone');
  const errors = form.formState.errors;

  // MÁSCARA INTELIGENTE BASEADA NO TIPO DE PESSOA
  const getIdentificationMask = (isEnterprise: boolean) => {
    return isEnterprise ? '99.999.999/9999-99' : '999.999.999-99';
  };

  const currentIdentificationMask = getIdentificationMask(isEnterpriseValue);

  // MÁSCARA DE TELEFONE
  const getPhoneMask = (value: string | undefined | null) => {
    const cleaned = cleanNumber(value);
    if (cleaned.length > 10 || cleaned[2] === '9') {
      return '(99) 99999-9999';
    }
    return '(99) 9999-9999';
  };

  async function onSubmit(data: FormSchemaType) {
    const identificationClean = cleanNumber(data.identification);
    const phoneClean = cleanNumber(data.phone);

    const isEnterprise = data.isEnterprise || false;
    const finalContact = isEnterprise ? data.contact : data.name;

    await client({
      name: data.name,
      identification: identificationClean || null,
      phone: phoneClean || null,
      email: data.email || null,
      contract: data.contract ? data.contract : false,
      isEnterprise: isEnterprise,
      contact: finalContact || undefined,
    })
  }

  const getErrorClass = (fieldName: keyof FormSchemaType) => {
    return errors[fieldName] ? 'border-red-500 focus-visible:ring-red-500' : '';
  }

  return (
    <DialogContent className="w-full max-w-lg sm:max-w-2xl overflow-y-auto max-h-[90vh]">
      <DialogHeader>
        <DialogTitle>Cadastro de Cliente</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-6 pt-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {/* TIPO DE PESSOA (SWITCH) - TOPO */}
          <div className="sm:col-span-12 flex justify-end">
            <FormField
              control={form.control}
              name="isEnterprise"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-gray-100 p-3 shadow-sm bg-gray-50/50">
                  <div className="flex flex-row items-center space-x-2">
                    <Building2 className={`h-5 w-5 ${field.value ? 'text-minsk-600' : 'text-gray-400'}`} />
                    <FormLabel className="text-sm font-medium text-gray-700 cursor-pointer">
                      Pessoa Jurídica?
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-minsk-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* NOME (FULL WIDTH) */}
          <div className="sm:col-span-12">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Nome Completo / Razão Social *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={isEnterpriseValue ? "Razão Social da Empresa" : "Nome do Cliente"}
                      className={getErrorClass('name')}
                      {...field}
                    />
                  </FormControl>
                  {errors.name && (
                    <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* CPF / CNPJ (MEIA LARGURA) */}
          <div className="sm:col-span-6">
            <FormField
              control={form.control}
              name="identification"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{isEnterpriseValue ? 'CNPJ' : 'CPF'}</FormLabel>
                  <FormControl>
                    <MaskedInput
                      mask={currentIdentificationMask}
                      maskChar={null}
                      placeholder={isEnterpriseValue ? "00.000.000/0000-00" : "000.000.000-00"}
                      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${getErrorClass('identification')}`}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  {errors.identification && (
                    <p className="text-xs text-red-500 mt-1">{errors.identification.message}</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* TELEFONE (MEIA LARGURA) */}
          <div className="sm:col-span-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Telefone / Celular</FormLabel>
                  <FormControl>
                    <MaskedInput
                      mask={getPhoneMask(phoneValue)}
                      maskChar={null}
                      placeholder="(99) 99999-9999"
                      className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${getErrorClass('phone')}`}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  </FormControl>
                  {errors.phone && (
                    <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* E-MAIL (FULL WIDTH OU COL-6 SE TIVER CONTATO) */}
          <div className={isEnterpriseValue ? "sm:col-span-6" : "sm:col-span-12"}>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contato@empresa.com"
                      className={getErrorClass('email')}
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  {errors.email && (
                    <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* CONTATO NA EMPRESA (VISÍVEL APENAS SE PJ) */}
          {isEnterpriseValue && (
            <div className="sm:col-span-6">
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pessoa de Contato *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome do responsável"
                        className={getErrorClass('contact')}
                        value={field.value ?? ''}
                        {...field}
                      />
                    </FormControl>
                    {errors.contact && (
                      <p className="text-xs text-red-500 mt-1">{errors.contact.message}</p>
                    )}
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* CONTRATO (BASE) */}
          <div className="sm:col-span-12 border-t pt-4">
            <FormField
              control={form.control}
              name="contract"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-gray-50 dark:bg-gray-800/50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base font-semibold">
                      Contrato de Fidelidade
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Este cliente possui contrato ativo?
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-vida-loca-500"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* BOTÃO SUBMIT */}
          <div className="sm:col-span-12 flex justify-end pt-2">
            <Button
              type="submit"
              className="w-full sm:w-auto bg-gradient-to-r from-minsk-500 to-minsk-600 hover:from-minsk-600 hover:to-minsk-700 text-white font-semibold transition-all shadow-md active:scale-95"
            >
              <FilePen className="w-4 h-4 mr-2" />
              {isEnterpriseValue ? 'Cadastrar Empresa' : 'Cadastrar Cliente'}
            </Button>
          </div>

        </form>
      </Form>
    </DialogContent>
  )
}