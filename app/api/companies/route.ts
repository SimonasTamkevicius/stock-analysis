import CompanyFinancials from "@/lib/models/CompanyFinancials";
import { NextResponse } from "next/server";

import { connectToDatabase } from "@/lib/data/mongodb";

export async function GET() {
    try {
        await connectToDatabase();
        const companies = await CompanyFinancials.find();
        const sortedCompanies = companies.sort((a, b) => a.ticker.localeCompare(b.ticker));
        return NextResponse.json(sortedCompanies.map((company) => company.ticker));
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}