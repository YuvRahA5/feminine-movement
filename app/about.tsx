import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Card, Screen, T } from '../src/ui';
import { C } from '../src/theme';

export default function About() {
  return (
    <Screen>
      <Btn kind="ghost" label="› חזרה" onPress={() => router.back()} style={{ alignSelf: 'flex-end' }} />
      <View style={{ height: 280, borderRadius: 28, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
        <T color={C.muted}>[תמונה שלך בעקבים]</T>
      </View>
      <T size={32} weight="bold">היי, אני יובל 🖤</T>
      <T size={17} color="#E8DCD2">[כמה מילים על הדרך שלך: מתי התחלת לרקוד, ואיך התאהבת בעקבים]</T>
      <T size={17} color="#E8DCD2">בשיעורים שלי העקבים הם רק ההתחלה. מה שאנחנו באמת מתרגלות זה אהבה עצמית, קבלה, שחרור שליטה והתמסרות: לגוף, למוזיקה ולרגע.</T>
      <T size={17} color="#E8DCD2">המרחב שלנו פתוח, חושני ובטוח. אין כאן נכון או לא נכון, אין השוואות, ואין צורך בניסיון. יש רק אותך, כמו שאת.</T>
      <Card style={{ borderStyle: 'dashed', borderColor: C.gold }}>
        <T size={13} weight="bold" color={C.gold}>בקרוב</T>
        <T size={19} weight="bold">תרגול מהבית וקורס דיגיטלי</T>
        <T size={14} color={C.muted}>בשבועות בלי שיעורים יחכו לך כאן סרטוני תרגול, וקורס דיגיטלי שאפשר לרקוד איתו מכל מקום.</T>
      </Card>
    </Screen>
  );
}
