"use client";

import { Mail, Phone, Building2 } from "lucide-react";

interface DriverInfoProps {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  company?: string;
}

export function DriverInfo({ firstName, lastName, email, phone, company = "Eco Drive SRL" }: DriverInfoProps) {
  return (
    <div className="space-y-3">
      {/* Name */}
      <h2 className="text-4xl font-bold text-white">
        {firstName} {lastName}
      </h2>

      {/* Contact Info */}
      <div className="space-y-2">
        {email && (
          <a 
            href={`mailto:${email}`}
            className="flex items-center gap-2.5 text-gray-300 hover:text-white transition-colors group"
          >
            <Mail className="h-4 w-4 text-gray-500 group-hover:text-white" />
            <span className="text-base">{email}</span>
          </a>
        )}
        
        <a 
          href={`tel:${phone}`}
          className="flex items-center gap-2.5 text-gray-300 hover:text-white transition-colors group"
        >
          <Phone className="h-4 w-4 text-gray-500 group-hover:text-white" />
          <span className="text-base">{phone}</span>
        </a>

        {company && (
          <div className="flex items-center gap-2.5 text-gray-400">
            <Building2 className="h-4 w-4 text-gray-500" />
            <span className="text-base">{company}</span>
          </div>
        )}
      </div>
    </div>
  );
}
