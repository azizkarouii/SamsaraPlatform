package com.samsara.config;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * French and Arabic versions of the error messages the API returns (the code raises them in English).
 * ApiMessagesTest fails if a message raised in the code is missing here.
 */
public final class ApiMessages {

    private record Text(String fr, String ar) {
        String in(String language) {
            return "ar".equals(language) ? ar : fr;
        }
    }

    private record Dynamic(Pattern pattern, Text text) {}

    private static final Map<String, Text> EXACT = Map.ofEntries(
            entry("Access denied", "Accès refusé", "تم رفض الوصول"),
            entry("Authentication required", "Connexion requise", "يجب تسجيل الدخول"),
            entry("Invalid request", "Requête invalide", "طلب غير صالح"),
            entry("Malformed request body", "Requête invalide", "طلب غير صالح"),
            entry("Operation conflicts with existing data", "Cette opération entre en conflit avec des données existantes", "تتعارض هذه العملية مع بيانات موجودة"),
            entry("Unexpected error", "Erreur inattendue", "خطأ غير متوقع"),
            entry("Not allowed to remove this samsar", "Vous ne pouvez pas retirer ce samsar", "لا يمكنك إزالة هذا السمسار"),
            entry("Only the property owner can do this", "Seul le propriétaire de la maison peut faire cela", "يمكن لمالك المنزل فقط القيام بذلك"),
            entry("You cannot give money back on this reservation", "Vous ne pouvez pas rendre d'argent sur cette réservation", "لا يمكنك إعادة مال في هذا الحجز"),
            entry("You do not have access to this property", "Vous n'avez pas accès à cette maison", "ليس لديك وصول إلى هذا المنزل"),
            entry("You do not have access to this reservation", "Vous n'avez pas accès à cette réservation", "ليس لديك وصول إلى هذا الحجز"),
            entry("A negotiated price must be below the usual price of the stay", "Le prix négocié doit être inférieur au prix habituel du séjour", "يجب أن يكون السعر المتفاوض عليه أقل من السعر المعتاد للإقامة"),
            entry("A reservation cannot start in the past", "Une réservation ne peut pas commencer dans le passé", "لا يمكن أن يبدأ الحجز في الماضي"),
            entry("Advance must be between 0 and the total amount", "L'acompte doit être compris entre 0 et le montant total", "يجب أن يكون العربون بين 0 والمبلغ الإجمالي"),
            entry("Allowed deals are 10, 20 or 30 TND per day, or a 10% commission", "Tarifs autorisés : 10, 20 ou 30 TND par jour, ou 10 % du total", "التعريفات المسموح بها: 10 أو 20 أو 30 دينارًا يوميًا، أو 10% من الإجمالي"),
            entry("Capacity and bathrooms cannot be negative", "La capacité et les salles de bain ne peuvent pas être négatives", "لا يمكن أن تكون السعة والحمامات سالبة"),
            entry("Client name is required", "Le nom du client est requis", "اسم العميل مطلوب"),
            entry("Current password is incorrect", "Le mot de passe actuel est incorrect", "كلمة المرور الحالية غير صحيحة"),
            entry("Each image must be 5 MB or less", "Chaque image doit faire 5 Mo au maximum", "يجب ألا يتجاوز حجم كل صورة 5 ميغابايت"),
            entry("Each period needs a price above zero", "Chaque période doit avoir un prix supérieur à zéro", "يجب أن يكون لكل فترة سعر أعلى من الصفر"),
            entry("Each period needs a valid start and end (day and month)", "Chaque période doit avoir un début et une fin valides (jour et mois)", "يجب أن يكون لكل فترة بداية ونهاية صالحتان (اليوم والشهر)"),
            entry("Email and phone are required", "L'email et le téléphone sont requis", "البريد الإلكتروني والهاتف مطلوبان"),
            entry("Empty image file", "Le fichier image est vide", "ملف الصورة فارغ"),
            entry("End date must be on or after start date", "La date de fin doit être égale ou postérieure à la date de début", "يجب أن يكون تاريخ النهاية مساويًا لتاريخ البداية أو بعده"),
            entry("Invalid dates (expected yyyy-MM-dd)", "Dates invalides", "تواريخ غير صالحة"),
            entry("Invalid image key", "Image invalide", "صورة غير صالحة"),
            entry("Links must be valid web addresses (http or https)", "Les liens doivent être des adresses web valides (http ou https)", "يجب أن تكون الروابط عناوين ويب صالحة (http أو https)"),
            entry("No image received", "Aucune image reçue", "لم يتم استلام أي صورة"),
            entry("Only JPEG, PNG and WebP images are accepted", "Seules les images JPEG, PNG et WebP sont acceptées", "تُقبل صور JPEG وPNG وWebP فقط"),
            entry("Period too long", "Période trop longue", "الفترة طويلة جدًا"),
            entry("Periods with different prices cannot overlap", "Deux périodes de prix ne peuvent pas se chevaucher", "لا يمكن أن تتداخل فترتان بسعرين"),
            entry("Phone number is required for a samsar account", "Le téléphone est obligatoire pour un compte samsar", "الهاتف إلزامي لحساب السمسار"),
            entry("Phone number must contain at least 8 digits", "Le téléphone doit contenir au moins 8 chiffres", "يجب أن يحتوي الهاتف على 8 أرقام على الأقل"),
            entry("Prices and distances cannot be negative", "Les prix et les distances ne peuvent pas être négatifs", "لا يمكن أن تكون الأسعار والمسافات سالبة"),
            entry("Property is required", "La maison est requise", "المنزل مطلوب"),
            entry("Property, email and phone are required", "La maison, l'email et le téléphone sont requis", "المنزل والبريد الإلكتروني والهاتف مطلوبة"),
            entry("Set the main price before adding prices by period", "Renseignez le prix principal avant d'ajouter des prix par période", "أدخل السعر الرئيسي قبل إضافة أسعار حسب الفترة"),
            entry("Start date and end date are required", "Les dates de début et de fin sont requises", "تاريخا البداية والنهاية مطلوبان"),
            entry("Start date must be before or equal to end date", "La date de début doit précéder ou égaler la date de fin", "يجب أن يكون تاريخ البداية قبل تاريخ النهاية أو مساويًا له"),
            entry("Status must be available, pending or unavailable", "Le statut doit être disponible, en attente ou indisponible", "يجب أن تكون الحالة متاحة أو قيد الانتظار أو غير متاحة"),
            entry("The amount paid after the advance cannot exceed the balance", "Le montant payé après l'acompte ne peut pas dépasser le solde", "لا يمكن أن يتجاوز المبلغ المدفوع بعد العربون الرصيد"),
            entry("The new end must be between the arrival and the planned end", "La nouvelle fin doit se situer entre l'arrivée et la fin prévue", "يجب أن تكون النهاية الجديدة بين الوصول والنهاية المقررة"),
            entry("The new order must list every image of the house exactly once", "Le nouvel ordre doit contenir chaque image une seule fois", "يجب أن يتضمن الترتيب الجديد كل صورة مرة واحدة"),
            entry("The samsar gain cannot go below what he already refunded", "Le gain du samsar ne peut pas passer sous ce qu'il a déjà rendu", "لا يمكن أن يقل ربح السمسار عما أعاده بالفعل"),
            entry("The total cannot go below what was already refunded", "Le total ne peut pas passer sous ce qui a déjà été rendu", "لا يمكن أن يقل الإجمالي عما أُعيد بالفعل"),
            entry("This account is not a samsar account", "Ce compte n'est pas un compte samsar", "هذا الحساب ليس حساب سمسار"),
            entry("This reset link is invalid or has expired", "Ce lien de réinitialisation est invalide ou a expiré", "رابط إعادة التعيين هذا غير صالح أو منتهي الصلاحية"),
            entry("Times must use the HH:mm format", "Les heures doivent être au format HH:mm", "يجب أن تكون الأوقات بصيغة HH:mm"),
            entry("Title is required", "Le titre est requis", "العنوان مطلوب"),
            entry("Too many failed attempts: try again in 15 minutes", "Trop de tentatives échouées : réessayez dans 15 minutes", "محاولات فاشلة كثيرة: أعد المحاولة بعد 15 دقيقة"),
            entry("Total amount is required and must be positive", "Le montant total est requis et doit être positif", "المبلغ الإجمالي مطلوب ويجب أن يكون موجبًا"),
            entry("You have no property to share", "Vous n'avez aucune maison à partager", "ليس لديك منزل لمشاركته"),
            entry("propertyId is required", "La maison est requise", "المنزل مطلوب"),
            entry("A completed or cancelled reservation cannot be modified", "Une réservation terminée ou annulée ne peut pas être modifiée", "لا يمكن تعديل حجز منتهٍ أو ملغى"),
            entry("A pending reservation uses some of these dates: cancel it first", "Une réservation en attente utilise certaines de ces dates : annulez-la d'abord", "يستخدم حجز قيد الانتظار بعض هذه التواريخ: ألغه أولًا"),
            entry("Email already in use", "Cet email est déjà utilisé", "هذا البريد الإلكتروني مستخدم بالفعل"),
            entry("Invalid credentials", "Email ou mot de passe incorrect", "البريد الإلكتروني أو كلمة المرور غير صحيحة"),
            entry("Money cannot be given back at this stage of the reservation", "Impossible de rendre de l'argent à ce stade de la réservation", "لا يمكن إعادة المال في هذه المرحلة من الحجز"),
            entry("Only a stay in progress can end early", "Seul un séjour en cours peut se terminer plus tôt", "يمكن إنهاء الإقامة الجارية فقط مبكرًا"),
            entry("Samsar already assigned to all your properties", "Ce samsar est déjà sur toutes vos maisons", "هذا السمسار موجود بالفعل على جميع منازلك"),
            entry("Samsar already assigned to this property", "Ce samsar est déjà sur cette maison", "هذا السمسار موجود بالفعل على هذا المنزل"),
            entry("Some of these dates are already reserved", "Certaines de ces dates sont déjà réservées", "بعض هذه التواريخ محجوزة بالفعل"),
            entry("Some of these dates are marked unavailable by the owner", "Certaines de ces dates sont bloquées par le propriétaire", "بعض هذه التواريخ محظورة من طرف المالك"),
            entry("The stay cannot start before the arrival date", "Le séjour ne peut pas commencer avant la date d'arrivée", "لا يمكن أن تبدأ الإقامة قبل تاريخ الوصول"),
            entry("These dates are already confirmed for another reservation", "Ces dates sont déjà confirmées pour une autre réservation", "هذه التواريخ مؤكدة بالفعل لحجز آخر"),
            entry("These dates overlap an existing reservation", "Ces dates chevauchent une réservation existante", "تتداخل هذه التواريخ مع حجز موجود"),
            entry("This property still has pending, confirmed or in-progress reservations", "Cette maison a encore des réservations en attente, confirmées ou en cours", "لا يزال لهذا المنزل حجوزات قيد الانتظار أو مؤكدة أو جارية"),
            entry("Availability not found", "Disponibilité introuvable", "التوفر غير موجود"),
            entry("Image not found", "Image introuvable", "الصورة غير موجودة"),
            entry("Notification not found", "Notification introuvable", "الإشعار غير موجود"),
            entry("Owner not found", "Propriétaire introuvable", "المالك غير موجود"),
            entry("Property not found", "Maison introuvable", "المنزل غير موجود"),
            entry("Reservation not found", "Réservation introuvable", "الحجز غير موجود"),
            entry("Samsar not found with that email and phone", "Aucun samsar avec cet email et ce téléphone", "لا يوجد سمسار بهذا البريد الإلكتروني والهاتف"),
            entry("Shared property link not found", "Partage introuvable", "المشاركة غير موجودة"),
            entry("User not found", "Utilisateur introuvable", "المستخدم غير موجود"));

    private static final List<Dynamic> DYNAMIC = List.of(
            dynamic("A house can have at most (\\d+) links", "Une maison peut avoir au maximum $1 liens", "يمكن أن يكون للمنزل $1 روابط كحد أقصى"),
            dynamic("A house can have at most (\\d+) images \\((\\d+) already\\)", "Une maison peut avoir au maximum $1 images ($2 déjà)", "يمكن أن يكون للمنزل $1 صور كحد أقصى ($2 بالفعل)"),
            dynamic("Invalid .* \\(expected yyyy-MM-dd\\)", "Date invalide", "تاريخ غير صالح"),
            dynamic("The .* is required", "Date requise", "التاريخ مطلوب"),
            dynamic("Cannot change status from .* to .*", "Ce changement de statut n'est pas possible", "لا يمكن تغيير الحالة بهذا الشكل"),
            dynamic("Unknown status: .*", "Statut inconnu", "حالة غير معروفة"),
            dynamic("Total exceeds the allowed maximum of (\\d+) TND", "Le total dépasse le maximum autorisé de $1 TND", "يتجاوز الإجمالي الحد الأقصى المسموح به وهو $1 دينارًا"),
            dynamic("The amount given back must be between 0 and ([\\d.,]+) TND", "Le montant rendu doit être compris entre 0 et $1 TND", "يجب أن يكون المبلغ المعاد بين 0 و$1 دينارًا"));

    private ApiMessages() {
    }

    /** @param language value of the Accept-Language header; anything but fr or ar keeps the English text */
    public static String translate(String message, String language) {
        String code = language == null ? "" : language.trim().toLowerCase();
        code = code.length() >= 2 ? code.substring(0, 2) : code;
        if (!code.equals("fr") && !code.equals("ar")) {
            return message;
        }
        Text exact = EXACT.get(message);
        if (exact != null) {
            return exact.in(code);
        }
        for (Dynamic dynamic : DYNAMIC) {
            Matcher matcher = dynamic.pattern().matcher(message);
            if (matcher.matches()) {
                return matcher.replaceFirst(dynamic.text().in(code));
            }
        }
        return message;
    }

    /** For the test checking that every message of the code has a translation. */
    public static boolean isKnown(String message) {
        return EXACT.containsKey(message) || DYNAMIC.stream().anyMatch(d -> d.pattern().matcher(message).matches());
    }

    private static Map.Entry<String, Text> entry(String english, String french, String arabic) {
        return Map.entry(english, new Text(french, arabic));
    }

    private static Dynamic dynamic(String pattern, String french, String arabic) {
        return new Dynamic(Pattern.compile(pattern), new Text(french, arabic));
    }
}
