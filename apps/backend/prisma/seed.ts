/**
 * Seed script for MAO Clinics — demo tenant
 * Run with: pnpm db:seed  (npx ts-node prisma/seed.ts)
 *
 * Creates:
 *   - 1 demo tenant (Clínica San Miguel)
 *   - 1 admin user + 3 doctors (users) + 1 receptionist
 *   - 3 doctor profiles linked to their users
 *   - 20 patients
 */

import { PrismaClient, Role, Specialty, BloodType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const SALT_ROUNDS = 10;

// ---------------------------------------------------------------------------
// Tenant
// ---------------------------------------------------------------------------
const demoTenant = {
  id: DEMO_TENANT_ID,
  name: 'Clínica San Miguel',
  slug: 'clinica-san-miguel',
  ruc: '20512345678',
  address: 'Av. Benavides 1234, Miraflores, Lima',
  phone: '961234567',
  email: 'contacto@clinicasanmiguel.pe',
  themeConfig: {
    primary: '#1A5F9E',
    primaryLight: '#2E7DC0',
    primaryDark: '#0D3D6E',
    secondary: '#2EAA6E',
    secondaryLight: '#3DC47E',
    surface: '#F8FAFC',
    sidebarBg: '#1A2740',
    sidebarText: '#E2EAF4',
    borderRadius: '8px',
    logoUrl: null,
  },
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
const usersData = [
  // Admin
  {
    id: '00000000-0000-0000-0000-000000000010',
    tenantId: DEMO_TENANT_ID,
    email: 'admin@clinicasanmiguel.pe',
    firstName: 'Miguel',
    lastName: 'Fernández Ochoa',
    role: Role.admin,
    plainPassword: 'Admin1234!',
  },
  // Receptionist
  {
    id: '00000000-0000-0000-0000-000000000011',
    tenantId: DEMO_TENANT_ID,
    email: 'recepcion@clinicasanmiguel.pe',
    firstName: 'Lucía',
    lastName: 'Quispe Vargas',
    role: Role.receptionist,
    plainPassword: 'Recep1234!',
  },
  // Doctors
  {
    id: '00000000-0000-0000-0000-000000000012',
    tenantId: DEMO_TENANT_ID,
    email: 'c.garcia@clinicasanmiguel.pe',
    firstName: 'Carlos Eduardo',
    lastName: 'García Quispe',
    role: Role.doctor,
    plainPassword: 'Doctor1234!',
  },
  {
    id: '00000000-0000-0000-0000-000000000013',
    tenantId: DEMO_TENANT_ID,
    email: 'r.torres@clinicasanmiguel.pe',
    firstName: 'Rosa María',
    lastName: 'Torres Mamani',
    role: Role.doctor,
    plainPassword: 'Doctor1234!',
  },
  {
    id: '00000000-0000-0000-0000-000000000014',
    tenantId: DEMO_TENANT_ID,
    email: 'j.mendoza@clinicasanmiguel.pe',
    firstName: 'Javier Alejandro',
    lastName: 'Mendoza Silva',
    role: Role.doctor,
    plainPassword: 'Doctor1234!',
  },
];

// ---------------------------------------------------------------------------
// Doctor profiles
// ---------------------------------------------------------------------------
const doctorsData = [
  {
    id: '00000000-0000-0000-0000-000000000020',
    tenantId: DEMO_TENANT_ID,
    userId: '00000000-0000-0000-0000-000000000012',
    cmp: '45231',      // Colegio Médico del Perú number
    specialty: Specialty.general,
    bio: 'Médico cirujano con 12 años de experiencia en medicina general y preventiva.',
    consultationFee: 80.00,
    appointmentDurationMin: 30,
    schedule: {
      monday:    { start: '08:00', end: '13:00' },
      tuesday:   { start: '08:00', end: '13:00' },
      wednesday: { start: '08:00', end: '13:00' },
      thursday:  { start: '08:00', end: '13:00' },
      friday:    { start: '08:00', end: '12:00' },
    },
  },
  {
    id: '00000000-0000-0000-0000-000000000021',
    tenantId: DEMO_TENANT_ID,
    userId: '00000000-0000-0000-0000-000000000013',
    cmp: '62810',
    specialty: Specialty.pediatrics,
    bio: 'Pediatra especialista en desarrollo infantil y neonatología. Atención desde recién nacidos.',
    consultationFee: 100.00,
    appointmentDurationMin: 40,
    schedule: {
      monday:    { start: '09:00', end: '14:00' },
      wednesday: { start: '09:00', end: '14:00' },
      friday:    { start: '09:00', end: '13:00' },
      saturday:  { start: '09:00', end: '12:00' },
    },
  },
  {
    id: '00000000-0000-0000-0000-000000000022',
    tenantId: DEMO_TENANT_ID,
    userId: '00000000-0000-0000-0000-000000000014',
    cmp: '38904',
    specialty: Specialty.cardiology,
    bio: 'Cardiólogo intervencionista con subespecialidad en insuficiencia cardíaca y arritmias.',
    consultationFee: 150.00,
    appointmentDurationMin: 45,
    schedule: {
      tuesday:  { start: '14:00', end: '19:00' },
      thursday: { start: '14:00', end: '19:00' },
      saturday: { start: '10:00', end: '13:00' },
    },
  },
];

// ---------------------------------------------------------------------------
// Patients (20)
// ---------------------------------------------------------------------------
const patientsData = [
  {
    id: '00000000-0000-0000-0001-000000000001',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Andrés',
    lastName: 'Castillo Romero',
    dni: '45123678',
    phone: '987654321',
    email: 'andres.castillo@gmail.com',
    birthDate: new Date('1985-03-14'),
    gender: 'male',
    bloodType: BloodType.O_POS,
    address: 'Jr. Las Flores 342, Miraflores',
    district: 'Miraflores',
    allergies: 'Penicilina',
    notes: 'Paciente con hipertensión arterial controlada.',
  },
  {
    id: '00000000-0000-0000-0001-000000000002',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Carmen Rosa',
    lastName: 'Huanca Ticona',
    dni: '32567890',
    phone: '912345678',
    email: 'carmen.huanca@gmail.com',
    birthDate: new Date('1972-07-22'),
    gender: 'female',
    bloodType: BloodType.A_POS,
    address: 'Av. El Sol 567, San Borja',
    district: 'San Borja',
    allergies: null,
    notes: 'Diabética tipo 2, en tratamiento con metformina.',
  },
  {
    id: '00000000-0000-0000-0001-000000000003',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Luis Miguel',
    lastName: 'Quispe Apaza',
    dni: '71234509',
    phone: '923456789',
    email: 'luis.quispe@gmail.com',
    birthDate: new Date('1993-11-05'),
    gender: 'male',
    bloodType: BloodType.B_NEG,
    address: 'Calle Los Pinos 89, Surco',
    district: 'Santiago de Surco',
    allergies: 'Ibuprofeno, Aspirina',
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000004',
    tenantId: DEMO_TENANT_ID,
    firstName: 'María Elena',
    lastName: 'Vargas Ccopa',
    dni: '28901234',
    phone: '934567891',
    email: 'maria.vargas@gmail.com',
    birthDate: new Date('1968-01-30'),
    gender: 'female',
    bloodType: BloodType.AB_POS,
    address: 'Av. Javier Prado Este 1890, La Molina',
    district: 'La Molina',
    allergies: null,
    notes: 'Hipotiroidismo, toma levotiroxina diariamente.',
  },
  {
    id: '00000000-0000-0000-0001-000000000005',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Jorge Antonio',
    lastName: 'Mamani Flores',
    dni: '60234781',
    phone: '945678912',
    email: 'jorge.mamani@gmail.com',
    birthDate: new Date('1999-06-18'),
    gender: 'male',
    bloodType: BloodType.O_NEG,
    address: 'Jr. Independencia 231, Barranco',
    district: 'Barranco',
    allergies: null,
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000006',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Patricia',
    lastName: 'Mendoza Chávez',
    dni: '41567823',
    phone: '956789123',
    email: 'patricia.mendoza@gmail.com',
    birthDate: new Date('1980-09-12'),
    gender: 'female',
    bloodType: BloodType.A_NEG,
    address: 'Calle Schell 456, Miraflores',
    district: 'Miraflores',
    allergies: 'Sulfonamidas',
    notes: 'Asma bronquial moderada persistente.',
  },
  {
    id: '00000000-0000-0000-0001-000000000007',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Roberto Carlos',
    lastName: 'Silva Palomino',
    dni: '53890145',
    phone: '967891234',
    email: 'roberto.silva@gmail.com',
    birthDate: new Date('1975-04-27'),
    gender: 'male',
    bloodType: BloodType.B_POS,
    address: 'Av. Guardia Civil 870, San Borja',
    district: 'San Borja',
    allergies: null,
    notes: 'Herniated disc L4-L5, tratamiento conservador.',
  },
  {
    id: '00000000-0000-0000-0001-000000000008',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Claudia Beatriz',
    lastName: 'Ramos Herrera',
    dni: '47312089',
    phone: '978912345',
    email: 'claudia.ramos@gmail.com',
    birthDate: new Date('1991-12-03'),
    gender: 'female',
    bloodType: BloodType.O_POS,
    address: 'Jr. Tarapacá 120, Pueblo Libre',
    district: 'Pueblo Libre',
    allergies: null,
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000009',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Fernando',
    lastName: 'Torres Inga',
    dni: '25678034',
    phone: '989123456',
    email: 'fernando.torres@gmail.com',
    birthDate: new Date('1960-08-15'),
    gender: 'male',
    bloodType: BloodType.A_POS,
    address: 'Av. Brasil 1540, Jesús María',
    district: 'Jesús María',
    allergies: 'Contraste yodado',
    notes: 'EPOC estadio II, ex-fumador 20 años.',
  },
  {
    id: '00000000-0000-0000-0001-000000000010',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Milagros',
    lastName: 'Cárdenas Rojas',
    dni: '72456801',
    phone: '991234567',
    email: 'milagros.cardenas@gmail.com',
    birthDate: new Date('2002-02-28'),
    gender: 'female',
    bloodType: BloodType.AB_NEG,
    address: 'Calle Los Álamos 34, San Isidro',
    district: 'San Isidro',
    allergies: null,
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000011',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Héctor Manuel',
    lastName: 'Gutiérrez Ponce',
    dni: '38120567',
    phone: '902345678',
    email: 'hector.gutierrez@gmail.com',
    birthDate: new Date('1970-05-09'),
    gender: 'male',
    bloodType: BloodType.O_POS,
    address: 'Av. Angamos Oeste 780, Surquillo',
    district: 'Surquillo',
    allergies: 'Penicilina, Cefalosporinas',
    notes: 'Gota, en tratamiento con alopurinol.',
  },
  {
    id: '00000000-0000-0000-0001-000000000012',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Ana Lucía',
    lastName: 'Paredes Soto',
    dni: '55230189',
    phone: '913456789',
    email: 'ana.paredes@gmail.com',
    birthDate: new Date('1988-10-17'),
    gender: 'female',
    bloodType: BloodType.B_POS,
    address: 'Jr. Colina 287, Lince',
    district: 'Lince',
    allergies: null,
    notes: 'Migraña crónica con aura.',
  },
  {
    id: '00000000-0000-0000-0001-000000000013',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Eduardo',
    lastName: 'Villanueva Cruz',
    dni: '64089123',
    phone: '924567891',
    email: 'eduardo.villanueva@gmail.com',
    birthDate: new Date('1995-07-31'),
    gender: 'male',
    bloodType: BloodType.A_NEG,
    address: 'Calle Monte Umbroso 654, La Molina',
    district: 'La Molina',
    allergies: null,
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000014',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Rosa Isabel',
    lastName: 'Llamocca Puma',
    dni: '29401567',
    phone: '935678912',
    email: 'rosa.llamocca@gmail.com',
    birthDate: new Date('1953-03-06'),
    gender: 'female',
    bloodType: BloodType.O_POS,
    address: 'Av. Túpac Amaru 1200, Comas',
    district: 'Comas',
    allergies: 'AINEs',
    notes: 'Artritis reumatoide, en tratamiento con metotrexato.',
  },
  {
    id: '00000000-0000-0000-0001-000000000015',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Diego Alonso',
    lastName: 'Benavides Tello',
    dni: '78901234',
    phone: '946789123',
    email: 'diego.benavides@gmail.com',
    birthDate: new Date('2005-11-20'),
    gender: 'male',
    bloodType: BloodType.A_POS,
    address: 'Jr. Loreto 88, Breña',
    district: 'Breña',
    allergies: null,
    notes: 'Asma alérgica, usa inhalador salbutamol SOS.',
  },
  {
    id: '00000000-0000-0000-0001-000000000016',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Karla Sofía',
    lastName: 'Ñaupas León',
    dni: '43678901',
    phone: '957891234',
    email: 'karla.naupas@gmail.com',
    birthDate: new Date('1983-08-25'),
    gender: 'female',
    bloodType: BloodType.B_NEG,
    address: 'Calle Las Magnolias 12, San Miguel',
    district: 'San Miguel',
    allergies: null,
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000017',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Victor Hugo',
    lastName: 'Condori Larico',
    dni: '57890345',
    phone: '968912345',
    email: 'victor.condori@gmail.com',
    birthDate: new Date('1978-01-14'),
    gender: 'male',
    bloodType: BloodType.AB_POS,
    address: 'Av. Colonial 2345, Callao',
    district: 'Callao',
    allergies: 'Clopidogrel',
    notes: 'Infarto previo 2022, en tratamiento cardiológico.',
  },
  {
    id: '00000000-0000-0000-0001-000000000018',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Susana',
    lastName: 'Morales Aguirre',
    dni: '34012678',
    phone: '979123456',
    email: 'susana.morales@gmail.com',
    birthDate: new Date('1965-06-02'),
    gender: 'female',
    bloodType: BloodType.O_NEG,
    address: 'Jr. Ucayali 456, Centro de Lima',
    district: 'Lima Cercado',
    allergies: null,
    notes: 'Osteoporosis post-menopáusica.',
  },
  {
    id: '00000000-0000-0000-0001-000000000019',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Gonzalo',
    lastName: 'Espinoza Medina',
    dni: '80234567',
    phone: '990123456',
    email: 'gonzalo.espinoza@gmail.com',
    birthDate: new Date('2001-04-10'),
    gender: 'male',
    bloodType: BloodType.A_POS,
    address: 'Calle Tahuantinsuyo 78, Independencia',
    district: 'Independencia',
    allergies: null,
    notes: null,
  },
  {
    id: '00000000-0000-0000-0001-000000000020',
    tenantId: DEMO_TENANT_ID,
    firstName: 'Valeria',
    lastName: 'Chávez Ruiz',
    dni: '69012345',
    phone: '901234567',
    email: 'valeria.chavez@gmail.com',
    birthDate: new Date('1990-09-08'),
    gender: 'female',
    bloodType: BloodType.B_POS,
    address: 'Av. Universitaria 3200, Los Olivos',
    district: 'Los Olivos',
    allergies: 'Látex',
    notes: 'Síndrome de colon irritable.',
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🌱  Starting seed...');

  // 1. Tenant
  await prisma.tenant.upsert({
    where: { id: DEMO_TENANT_ID },
    update: {},
    create: demoTenant,
  });
  console.log('✅  Tenant created:', demoTenant.name);

  // 2. Users (hash passwords first)
  for (const u of usersData) {
    const passwordHash = await bcrypt.hash(u.plainPassword, SALT_ROUNDS);
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        tenantId: u.tenantId,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        passwordHash,
        role: u.role,
      },
    });
  }
  console.log(`✅  ${usersData.length} users created`);

  // 3. Doctors
  for (const d of doctorsData) {
    await prisma.doctor.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    });
  }
  console.log(`✅  ${doctorsData.length} doctor profiles created`);

  // 4. Patients
  for (const p of patientsData) {
    await prisma.patient.upsert({
      where: { id: p.id },
      update: {},
      create: p,
    });
  }
  console.log(`✅  ${patientsData.length} patients created`);

  console.log('\n🎉  Seed complete!');
  console.log('\nDemo credentials:');
  console.log('  Admin      → admin@clinicasanmiguel.pe       / Admin1234!');
  console.log('  Recepción  → recepcion@clinicasanmiguel.pe   / Recep1234!');
  console.log('  Dr. García → c.garcia@clinicasanmiguel.pe    / Doctor1234!');
  console.log('  Dra. Torres→ r.torres@clinicasanmiguel.pe    / Doctor1234!');
  console.log('  Dr. Mendoza→ j.mendoza@clinicasanmiguel.pe   / Doctor1234!');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
