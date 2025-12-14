/**
 * Seed de categorías de interés para onboarding
 * 
 * Ejecutar con: npx ts-node prisma/seeds/interest-categories.seed.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Configurar conexión igual que en el servicio
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


const INTEREST_CATEGORIES = [
    // ========== FINANZAS (Core de Malet) ==========
    {
        id: 'personal-finance',
        name: 'Finanzas Personales',
        slug: 'personal-finance',
        description: 'Gestión del dinero personal, tips de ahorro y organización financiera',
        icon: '💰',
        color: '#10B981',
        order: 1
    },
    {
        id: 'investments',
        name: 'Inversiones',
        slug: 'investments',
        description: 'Estrategias de inversión, mercados financieros y crecimiento del capital',
        icon: '📈',
        color: '#3B82F6',
        order: 2
    },
    {
        id: 'crypto',
        name: 'Criptomonedas',
        slug: 'crypto',
        description: 'Bitcoin, Ethereum, blockchain y el ecosistema cripto',
        icon: '₿',
        color: '#F59E0B',
        order: 3
    },
    {
        id: 'savings',
        name: 'Ahorro',
        slug: 'savings',
        description: 'Técnicas de ahorro, fondos de emergencia y metas financieras',
        icon: '🏦',
        color: '#6366F1',
        order: 4
    },
    {
        id: 'budgeting',
        name: 'Presupuestos',
        slug: 'budgeting',
        description: 'Planificación y control de gastos, métodos de presupuesto',
        icon: '📊',
        color: '#EC4899',
        order: 5
    },

    // ========== EMPRENDIMIENTO ==========
    {
        id: 'entrepreneurship',
        name: 'Emprendimiento',
        slug: 'entrepreneurship',
        description: 'Crear y hacer crecer tu propio negocio',
        icon: '🚀',
        color: '#8B5CF6',
        order: 6
    },
    {
        id: 'freelance',
        name: 'Freelance',
        slug: 'freelance',
        description: 'Trabajo independiente, conseguir clientes y gestión freelance',
        icon: '💻',
        color: '#F97316',
        order: 7
    },
    {
        id: 'side-hustle',
        name: 'Ingresos Extra',
        slug: 'side-hustle',
        description: 'Negocios secundarios y formas de generar ingresos adicionales',
        icon: '💵',
        color: '#22C55E',
        order: 8
    },

    // ========== BIENES RAÍCES ==========
    {
        id: 'real-estate',
        name: 'Bienes Raíces',
        slug: 'real-estate',
        description: 'Inversiones inmobiliarias, compra y renta de propiedades',
        icon: '🏠',
        color: '#14B8A6',
        order: 9
    },

    // ========== TRADING ==========
    {
        id: 'trading',
        name: 'Trading',
        slug: 'trading',
        description: 'Análisis técnico, trading de acciones y estrategias de mercado',
        icon: '📉',
        color: '#DC2626',
        order: 10
    },
    {
        id: 'forex',
        name: 'Forex',
        slug: 'forex',
        description: 'Mercado de divisas, pares de monedas y trading forex',
        icon: '💱',
        color: '#0EA5E9',
        order: 11
    },

    // ========== IMPUESTOS Y LEGAL ==========
    {
        id: 'taxes',
        name: 'Impuestos',
        slug: 'taxes',
        description: 'Planificación fiscal, declaraciones y optimización de impuestos',
        icon: '🧾',
        color: '#64748B',
        order: 12
    },

    // ========== PLANIFICACIÓN A LARGO PLAZO ==========
    {
        id: 'retirement',
        name: 'Jubilación',
        slug: 'retirement',
        description: 'Planificación para el retiro, pensiones y fondos de jubilación',
        icon: '🏖️',
        color: '#0891B2',
        order: 13
    },

    // ========== REGIONALES ==========
    {
        id: 'venezuela',
        name: 'Venezuela',
        slug: 'venezuela',
        description: 'Finanzas y economía en Venezuela, consejos locales',
        icon: '🇻🇪',
        color: '#EF4444',
        order: 14
    },
    {
        id: 'latam',
        name: 'Latinoamérica',
        slug: 'latam',
        description: 'Finanzas en la región latinoamericana',
        icon: '🌎',
        color: '#0EA5E9',
        order: 15
    },
    {
        id: 'usa',
        name: 'Estados Unidos',
        slug: 'usa',
        description: 'Finanzas y oportunidades en USA, remesas',
        icon: '🇺🇸',
        color: '#1D4ED8',
        order: 16
    },

    // ========== EDUCACIÓN FINANCIERA ==========
    {
        id: 'financial-education',
        name: 'Educación Financiera',
        slug: 'financial-education',
        description: 'Aprendizaje sobre conceptos financieros básicos y avanzados',
        icon: '📚',
        color: '#A855F7',
        order: 17
    },

    // ========== DEUDAS ==========
    {
        id: 'debt-management',
        name: 'Manejo de Deudas',
        slug: 'debt-management',
        description: 'Estrategias para salir de deudas y manejar créditos',
        icon: '🔓',
        color: '#EAB308',
        order: 18
    }
];

async function seed() {
    console.log('🌱 Seeding interest categories...');

    for (const category of INTEREST_CATEGORIES) {
        await prisma.interest_category.upsert({
            where: { id: category.id },
            update: {
                name: category.name,
                slug: category.slug,
                description: category.description,
                icon: category.icon,
                color: category.color,
                order: category.order,
                is_active: true
            },
            create: {
                id: category.id,
                name: category.name,
                slug: category.slug,
                description: category.description,
                icon: category.icon,
                color: category.color,
                order: category.order,
                is_active: true
            }
        });

        console.log(`  ✅ ${category.icon} ${category.name}`);
    }

    console.log('\n🎉 Interest categories seeded successfully!');
    console.log(`   Total: ${INTEREST_CATEGORIES.length} categories`);
}

seed()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });

