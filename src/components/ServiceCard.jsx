import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const ServiceCard = ({ id, title, description, icon: Icon, price, category, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.45 }}
    className="h-full"
  >
    <Link to={`/services/${id}`} className="group flex h-full flex-col rounded-[1.3rem] border border-orange-100/70 bg-white/90 p-5 shadow-[0_10px_24px_hsl(24_75%_62%_/_0.08)] transition-all hover:-translate-y-1 hover:shadow-[0_14px_30px_hsl(24_75%_62%_/_0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700">{category}</span>
      </div>

      <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-auto pt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-orange-700">From {price}</span>
          <span className="text-sm text-slate-500 group-hover:text-orange-700">View details →</span>
        </div>
      </div>
    </Link>
  </motion.div>
);

export default ServiceCard;
