import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Globe, Award, BookOpen, Users, Building, ArrowLeft, School, GraduationCap, ShieldCheck, Trophy, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AboutUs() {
  const features = [
    { icon: School, title: "Традиции", text: "Основана в 1974 году, бережно храним историю села." },
    { icon: Users, title: "Сообщество", text: "Дружная семья из 450 учеников и 35 учителей." },
    { icon: Trophy, title: "Успех", text: "Лидеры района по результатам олимпиад и ЕГЭ." },
  ];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 scroll-smooth">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden bg-indigo-900">
        <div className="absolute inset-0 opacity-40">
           <img 
            src="https://sh-peschanskaya-r38.gosweb.gosuslugi.ru/netcat_files/33/105/ixOlI0jYWOA.jpg" 
            alt="School Building" 
            className="w-full h-full object-cover"
           />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 via-indigo-900/20 to-white"></div>
        
        <div className="relative z-10 text-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl px-6 py-2 rounded-full text-white text-xs font-black uppercase tracking-[0.3em] mb-8 border border-white/10">
              LMS Peschanoe
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-6 leading-none">
              Песчанская <br/> <span className="text-indigo-200">СОШ</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
              Платформа для управления образовательныим процессом Песчанской СОШ
            </p>
          </motion.div>
        </div>

        <Link to="/" className="absolute top-8 left-8 z-50 flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl text-white hover:bg-white/20 transition-all border border-white/10 group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest leading-none">В личный кабинет</span>
        </Link>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-6 -mt-20 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.2 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-indigo-100/50 border border-slate-100 flex flex-col items-center text-center group hover:-translate-y-2 transition-all duration-500"
            >
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-8 group-hover:bg-indigo-600 transition-colors duration-500">
                <f.icon className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-500" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tight mb-4">{f.title}</h3>
              <p className="text-slate-500 leading-relaxed font-serif text-lg">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Main Info */}
      <section className="max-w-7xl mx-auto px-6 py-32 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
        <div className="space-y-10">
          <div>
            <div className="text-indigo-600 font-black text-xs uppercase tracking-[0.4em] mb-4">Наше кредо</div>
            <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">
              Место, где <br/> <span className="text-slate-400">рождаются мечты</span>
            </h2>
          </div>
          
          <div className="space-y-8 text-slate-600 leading-relaxed font-serif text-xl border-l-4 border-indigo-500 pl-8">
             <p>
               Муниципальное казенное общеобразовательное учреждение «Песчанская средняя общеобразовательная школа» 
               Беловского района Курской области — это современный образовательный комплекс.
             </p>
             <p>
               Мы стремимся создать среду, в которой каждый ребенок может раскрыть свой потенциал, 
               используя как проверенные временем методики, так и передовые цифровые технологии.
             </p>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-6">
             <div className="flex gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                  <ShieldCheck className="text-indigo-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black uppercase text-xs mb-1">СБЕР-Школа</h4>
                  <p className="text-sm font-serif text-slate-500">Цифровая платформа обучения</p>
                </div>
             </div>
             <div className="flex gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0">
                  <GraduationCap className="text-indigo-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black uppercase text-xs mb-1">Центр Талантов</h4>
                  <p className="text-sm font-serif text-slate-500">30+ программ развития</p>
                </div>
             </div>
          </div>
        </div>

        <div className="relative">
           <div className="aspect-[4/5] rounded-[4rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(79,70,229,0.2)]">
              <img 
                src="https://avatars.mds.yandex.net/i?id=d25a4d98485c6948577deae685157d86b04e0a74-16848606-images-thumbs&n=13" 
                alt="Students" 
                className="w-full h-full object-cover"
              />
           </div>
           <div className="absolute -bottom-10 -left-10 bg-indigo-600 p-12 rounded-[3.5rem] shadow-2xl shadow-indigo-200 text-white hidden md:block">
              <p className="text-6xl font-black leading-none mb-2 tracking-tighter">50+</p>
              <p className="text-xs uppercase font-black tracking-widest opacity-80">Лет опыта</p>
           </div>
        </div>
      </section>

      {/* Contact Grid section */}
      <section className="bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block bg-indigo-100 text-indigo-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Свяжитесь с нами</div>
          <h2 className="text-4xl font-black tracking-tight uppercase mb-16">Официальная информация</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              { icon: MapPin, title: "Адрес", val: "Курская обл., с. Песчаное, ул. Школьная, 1" },
              { icon: Phone, title: "Телефон", val: "+7 (47149) 2-10-87" },
              { icon: Mail, title: "Email", val: "peschanoe-shkola@rambler.ru" },
              { icon: Globe, title: "Сайт", val: "bel-pes.ru" },
            ].map((c, i) => (
              <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all group">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-50 transition-colors">
                  <c.icon className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">{c.title}</h4>
                <p className="font-bold text-slate-900 leading-snug break-words">{c.val}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-16 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm inline-block text-slate-400 text-xs font-bold uppercase tracking-widest">
            ИНН: 4601003807 | КПП: 460101001 | ОГРН: 1024600785571
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-100">P</div>
            <div className="leading-tight">
              <h2 className="font-black uppercase tracking-tight text-xl">LMS Peschanoe</h2>
              <p className="text-[10px] uppercase font-black tracking-widest text-indigo-600">Система управления знаниями</p>
            </div>
          </div>
          <div className="flex gap-10 text-xs font-black uppercase tracking-widest text-slate-400">
             <span className="hover:text-indigo-600 transition-colors cursor-pointer">Карта</span>
             <span className="hover:text-indigo-600 transition-colors cursor-pointer">Документы</span>
             <span className="hover:text-indigo-600 transition-colors cursor-pointer">Безопасность</span>
          </div>
          <p className="text-xs text-slate-400 font-medium italic">© {new Date().getFullYear()} Песчанская СОШ</p>
        </div>
      </footer>
    </div>
  );
}
