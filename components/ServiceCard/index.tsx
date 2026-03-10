import React from "react";

export interface ServiceCardProps {
  name?: string;
  description?: string;
  icon?: string;
}

const ShieldIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6 text-[#0070F3]"
    aria-hidden="true"
  >
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7L12 2z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const ServiceCard = ({ name, description, icon }: ServiceCardProps) => {
  return (
    <div className="w-full p-2 mob:p-4 rounded-lg transition-all ease-out duration-300 hover:bg-white/5 hover:scale-105 cursor-pointer">
      <div className="flex items-center gap-2">
        {icon === "shield" && <ShieldIcon />}
        <h1 className="text-3xl">{name ?? "Heading"}</h1>
      </div>
      <p className="mt-5 opacity-40 text-xl">
        {description ??
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. "}
      </p>
    </div>
  );
};

export default ServiceCard;
