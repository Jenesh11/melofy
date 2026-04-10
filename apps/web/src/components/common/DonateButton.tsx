'use client';

import React from 'react';

interface DonateButtonProps {
  className?: string;
}

export const DonateButton: React.FC<DonateButtonProps> = ({ className }) => {
  return (
    <a
      href="https://payments.cashfree.com/forms/shrey"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-block no-underline active:scale-95 transition-transform ${className}`}
    >
      <div className="flex items-center p-2.5 rounded-[15px] border border-black/10 bg-[#a3d4ec] hover:brightness-105 transition-all shadow-sm">
        <div className="flex-shrink-0">
          <img
            src="https://cashfree-checkoutcartimages-prod.cashfree.com/Gemini_Generated_Image_f9h0qwf9h0qwf9h0ia7fipokp6g0_prod.png"
            alt="logo"
            className="w-10 h-10 rounded-full"
          />
        </div>
        <div className="flex flex-col items-center justify-center mx-2.5">
          <div className="font-sans text-black mb-1 text-sm font-semibold">
            Buy me a coffee
          </div>
          <div className="font-sans text-black/70 text-[10px] flex items-center gap-1">
            <span>Powered By Cashfree</span>
            <img
              src="https://cashfreelogo.cashfree.com/cashfreepayments/logosvgs/Group_4355.svg"
              alt="logo"
              className="w-4 h-4 vertical-middle"
            />
          </div>
        </div>
      </div>
    </a>
  );
};
