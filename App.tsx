import React, { useEffect, useMemo, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  View, Text, TextInput, FlatList, Pressable, SafeAreaView,
  ScrollView, Alert, StyleSheet
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const Colors = { bg:"#0f172a", card:"#1f2937", text:"#f8fafc", soft:"#cbd5e1", border:"#334155", accent:"#22d3ee" };

type Court = { id:string; name:string; city:string; rating:number; indoor:boolean };
const cities = ["Austin","Dallas","Houston","San Antonio","Plano","Round Rock","Cedar Park","Georgetown"];
const left = ["Lone Star","Riverwalk","Cedar Ridge","Maple","Oakview","Sunset","Mission","Summit","Creekside","Heritage"];
const right = ["Tennis Center","Courts","Racquet Club","Sports Park","Rec Center"];
const COURTS: Court[] = Array.from({ length: 60 }, (_, i) => ({
  id: `court-${i+1}`, name: `${left[i%left.length]} ${right[i%right.length]}`,
  city: cities[i%cities.length], rating: Math.round((3+(i%20)*0.1)*10)/10, indoor: (i%3)===0
}));

type Review = { id:string; courtId:string; rating:number; text:string; dateISO:string };
const STORAGE_KEY = "byob.tennis.reviews.v1";
const getAllReviews = async ():Promise<Review[]> => JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))||"[]");
const setAllReviews = async (l:Review[]) => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(l));
const addReview = async (r:Review) => { const all = await getAllReviews(); all.unshift(r); await setAllReviews(all); };
const getReviewsFor = async (id:string) => (await getAllReviews()).filter(r=>r.courtId===id);

function CourtCard({ c, onPress }:{c:Court; onPress:()=>void}) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={{flex:1}}>
        <Text style={styles.title}>{c.name}</Text>
        <Text style={styles.soft}>{c.city} • {c.indoor?"Indoor":"Outdoor"}</Text>
      </View>
      <Text style={styles.soft}>{c.rating.toFixed(1)} ★</Text>
    </Pressable>
  );
}

const Stack = createNativeStackNavigator();

function ListScreen({ navigation }: any) {
  const [q,setQ] = useState("");
  const data = useMemo(()=> {
    const t=q.trim().toLowerCase(); if(!t) return COURTS;
    return COURTS.filter(c=>c.name.toLowerCase().includes(t)||c.city.toLowerCase().includes(t));
  },[q]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <TextInput
          value={q} onChangeText={setQ}
          placeholder="Search courts or cities…" placeholderTextColor={Colors.soft}
          style={styles.input}
        />
        <Text style={[styles.soft,{marginBottom:8}]}>{data.length} result{data.length===1?"":"s"}</Text>
        <FlatList
          data={data}
          keyExtractor={i=>i.id}
          contentContainerStyle={{gap:12,paddingBottom:24}}
          renderItem={({item}) => <CourtCard c={item} onPress={()=>navigation.navigate("Detail",{courtId:item.id})} />}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

function DetailScreen({ route }: any) {
  const { courtId } = route.params;
  const court = COURTS.find(c=>c.id===courtId)!;
  const [reviews,setReviews]=useState<Review[]>([]);
  const [text,setText]=useState(""); const [stars,setStars]=useState(5);
  const refresh = async()=> setReviews(await getReviewsFor(courtId));
  useEffect(()=>{refresh();},[courtId]);

  const submit = async () => {
    if(!text.trim()) return Alert.alert("Please write a short review.");
    await addReview({ id:String(Date.now()), courtId, rating:stars, text:text.trim(), dateISO:new Date().toISOString() });
    setText(""); setStars(5); refresh(); Alert.alert("Thanks!","Your review was saved locally.");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.container,{gap:12}]}>
        <View style={styles.card}>
          <Text style={styles.title}>{court.name}</Text>
          <Text style={styles.soft}>{court.city}</Text>
          <Text style={[styles.soft,{marginTop:6}]}>{court.indoor?"Indoor":"Outdoor"} • Rating {court.rating.toFixed(1)} ★</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Leave a review</Text>
          <View style={{flexDirection:"row",gap:8,marginVertical:8}}>
            {[1,2,3,4,5].map(n=>(
              <Pressable key={n} onPress={()=>setStars(n)}
                style={[styles.chip,{borderColor:stars===n?Colors.accent:Colors.border,backgroundColor:stars===n?"#0b2530":"transparent"}]}>
                <Text style={{color:stars===n?Colors.accent:Colors.soft}}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={text} onChangeText={setText} multiline
            placeholder="Share your experience…" placeholderTextColor={Colors.soft}
            style={styles.textarea}
          />
          <Pressable onPress={submit} style={styles.button}>
            <Text style={{color:"#072635",fontWeight:"800"}}>Submit Review</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Reviews</Text>
          {reviews.length===0 ? <Text style={styles.soft}>No reviews yet.</Text> :
            reviews.map(r=>(
              <View key={r.id} style={{borderTopWidth:1,borderTopColor:Colors.border,paddingTop:8,marginTop:8}}>
                <Text style={styles.titleSmall}>{new Date(r.dateISO).toLocaleDateString()} • {r.rating}★</Text>
                <Text style={styles.soft}>{r.text}</Text>
              </View>
            ))
          }
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App(){
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{
        headerStyle:{backgroundColor:Colors.bg}, headerTitleStyle:{color:Colors.text},
        contentStyle:{backgroundColor:Colors.bg}
      }}>
        <Stack.Screen name="List" component={ListScreen} options={{title:"Tennis Courts"}} />
        <Stack.Screen name="Detail" component={DetailScreen} options={{title:"Court Details"}} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:Colors.bg},
  container:{padding:16},
  input:{backgroundColor:Colors.card,color:Colors.text,borderColor:Colors.border,borderWidth:1,borderRadius:12,paddingHorizontal:12,paddingVertical:10,marginBottom:6},
  card:{backgroundColor:Colors.card,borderColor:Colors.border,borderWidth:1,borderRadius:14,padding:16,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  title:{color:Colors.text,fontWeight:"800",fontSize:16}, titleSmall:{color:Colors.text,fontWeight:"700"},
  soft:{color:Colors.soft}, section:{color:Colors.text,fontWeight:"800",marginBottom:8},
  chip:{paddingHorizontal:12,paddingVertical:6,borderRadius:10,borderWidth:1},
  textarea:{minHeight:90,textAlignVertical:"top",backgroundColor:"#0b1220",color:Colors.text,borderColor:Colors.border,borderWidth:1,borderRadius:12,padding:12,marginVertical:8},
  button:{backgroundColor:Colors.accent,paddingVertical:12,alignItems:"center",borderRadius:12},
});
