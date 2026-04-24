export function Footer() {
  return (
    <footer className="relative z-10 border-t border-brand-border bg-brand-black">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex flex-col sm:flex-row mx-auto justify-between items-center gap-4">
        <div className="text-[9px] text-gray-600 uppercase tracking-widest text-center sm:text-left">
          7 Cohorts. One Civilization.
        </div>
        <div className="text-[9px] text-gray-600 uppercase text-center sm:text-right">
          A community proposal for 100x Engineers.<br className="sm:hidden" /> Not an official 100x product.
        </div>
      </div>
    </footer>
  );
}
