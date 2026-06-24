export type AppLanguage = 'fr' | 'en' | 'ar';

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  // Nav / layout
  dashboard: { fr: 'Tableau de bord', en: 'Dashboard', ar: 'لوحة القيادة' },
  properties: { fr: 'Propriétés', en: 'Properties', ar: 'العقارات' },
  my_houses: { fr: 'Mes maisons', en: 'My houses', ar: 'منازلي' },
  reservations: { fr: 'Réservations', en: 'Reservations', ar: 'الحجوزات' },
  shared_houses: { fr: 'Maisons partagées', en: 'Shared houses', ar: 'منازل مشتركة' },
  notifications: { fr: 'Notifications', en: 'Notifications', ar: 'الإشعارات' },
  profile: { fr: 'Profil', en: 'Profile', ar: 'الملف الشخصي' },
  logout: { fr: 'Déconnexion', en: 'Logout', ar: 'تسجيل الخروج' },
  language: { fr: 'Langue', en: 'Language', ar: 'اللغة' },
  dark_mode: { fr: 'Mode sombre', en: 'Dark mode', ar: 'الوضع المظلم' },
  light_mode: { fr: 'Mode clair', en: 'Light mode', ar: 'الوضع الفاتح' },

  // Property list
  my_properties: { fr: 'Mes maisons', en: 'My properties', ar: 'عقاراتي' },
  add_property: { fr: 'Ajouter une maison', en: 'Add property', ar: 'إضافة عقار' },
  filter_by_date: { fr: 'Filtrer par date', en: 'Filter by date', ar: 'تصفية حسب التاريخ' },
  choose_date: { fr: 'Choisir une date', en: 'Choose a date', ar: 'اختر تاريخ' },
  clear_filter: { fr: 'Effacer le filtre', en: 'Clear filter', ar: 'مسح التصفية' },
  search_by_title: { fr: 'Rechercher par titre', en: 'Search by title', ar: 'البحث بالعنوان' },
  search_properties: { fr: 'Rechercher...', en: 'Search properties...', ar: 'بحث...' },
  no_properties_found: { fr: 'Aucune maison trouvée', en: 'No properties found', ar: 'لم يتم العثور على عقارات' },
  add_first_property: { fr: 'Ajouter votre première maison', en: 'Add your first property', ar: 'أضف عقارك الأول' },
  title_col: { fr: 'Titre', en: 'Title', ar: 'العنوان' },
  address_col: { fr: 'Adresse', en: 'Address', ar: 'العنوان' },
  price_day_col: { fr: 'Prix/jour', en: 'Price/Day', ar: 'السعر/اليوم' },
  capacity_col: { fr: 'Capacité', en: 'Capacity', ar: 'السعة' },
  actions_col: { fr: 'Actions', en: 'Actions', ar: 'الإجراءات' },
  view: { fr: 'Voir', en: 'View', ar: 'عرض' },
  edit: { fr: 'Modifier', en: 'Edit', ar: 'تعديل' },
  share: { fr: 'Partager', en: 'Share', ar: 'مشاركة' },

  // Share dialog
  invite_samsar: { fr: 'Inviter un samsar', en: 'Invite a samsar', ar: 'دعوة سمسار' },
  invite_samsar_sub: { fr: 'Ajoutez un samsar à cette maison par email et téléphone.', en: 'Add a samsar to this property by email and phone.', ar: 'أضف سمسارًا إلى هذا العقار عبر البريد الإلكتروني والهاتف.' },
  samsar_email: { fr: 'Email du samsar', en: 'Samsar email', ar: 'البريد الإلكتروني للسمسار' },
  samsar_phone: { fr: 'Téléphone du samsar (+216)', en: 'Samsar phone (+216)', ar: 'هاتف السمسار (+216)' },
  allowed_increase: { fr: 'Augmentation autorisée', en: 'Allowed increase', ar: 'الزيادة المسموح بها' },
  cancel: { fr: 'Annuler', en: 'Cancel', ar: 'إلغاء' },
  send_invite: { fr: 'Envoyer l\'invitation', en: 'Send invite', ar: 'إرسال الدعوة' },
  invite_success: { fr: 'Samsar invité avec succès', en: 'Samsar invited successfully', ar: 'تمت دعوة السمسار بنجاح' },

  // Shared houses
  shared_management: { fr: 'Gestion partagée', en: 'Shared management', ar: 'الإدارة المشتركة' },
  manage_shared_access: { fr: 'Gérer les accès partagés', en: 'Manage shared access', ar: 'إدارة الوصول المشترك' },
  my_shared_houses: { fr: 'Mes maisons partagées', en: 'My shared houses', ar: 'منازلي المشتركة' },
  no_shared_properties: { fr: 'Aucune propriété partagée', en: 'No shared properties yet', ar: 'لا توجد عقارات مشتركة بعد' },
  no_shared_desc_samsar: { fr: 'Quand un propriétaire vous ajoute à une propriété, elle apparaîtra ici.', en: 'When an owner adds you to a property, it will appear here.', ar: 'عندما يضيفك مالك إلى عقار، سيظهر هنا.' },
  unsaved: { fr: 'Non enregistré', en: 'Unsaved', ar: 'غير محفوظ' },

  // Dashboard
  total_properties: { fr: 'Total maisons', en: 'Total Properties', ar: 'إجمالي العقارات' },
  total_reservations: { fr: 'Total réservations', en: 'Total Reservations', ar: 'إجمالي الحجوزات' },
  total_revenue: { fr: 'Revenu total', en: 'Total Revenue', ar: 'إجمالي الإيرادات' },
  pending_reservations: { fr: 'Réservations en attente', en: 'Pending Reservations', ar: 'الحجوزات المعلقة' },
  quick_actions: { fr: 'Actions rapides', en: 'Quick Actions', ar: 'إجراءات سريعة' },
  view_all: { fr: 'Voir tout', en: 'View All', ar: 'عرض الكل' },
  loading: { fr: 'Chargement...', en: 'Loading...', ar: 'جار التحميل...' },

  // Common
  back_to_list: { fr: 'Retour à la liste', en: 'Back to List', ar: 'عودة إلى القائمة' },
  delete: { fr: 'Supprimer', en: 'Delete', ar: 'حذف' },
  close: { fr: 'Fermer', en: 'Close', ar: 'إغلاق' },
  save: { fr: 'Enregistrer', en: 'Save', ar: 'حفظ' },
};

export function t(key: string, language: AppLanguage): string {
  return TRANSLATIONS[key]?.[language] ?? key;
}
