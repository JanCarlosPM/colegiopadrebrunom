-- Campos alineados con planilla Excel del cliente:
-- - N° estudiante (código en planilla, distinto del UUID interno)
-- - N° recibo (talonario físico), por movimiento de caja

alter table public.students
  add column if not exists student_code text;

comment on column public.students.student_code is
  'Número o código de estudiante en planilla / expediente (opcional).';

create unique index if not exists uq_students_student_code
  on public.students (student_code)
  where student_code is not null and trim(student_code) <> '';

alter table public.payments
  add column if not exists receipt_number text;

comment on column public.payments.receipt_number is
  'Número de recibo del talonario impreso (ej. correlativo del colegio).';

alter table public.other_payments
  add column if not exists receipt_number text;

comment on column public.other_payments.receipt_number is
  'Número de recibo del talonario para cobros especiales.';
