import React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from "react-native"
import { useNavigation } from "@react-navigation/native"
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"

export const Home = () => {
  const navigation = useNavigation()
  const { width } = useWindowDimensions()
  
  const menuItems = [
    {
      id: 'tuner',
      title: 'Tuner',
      subtitle: 'Professional instrument tuning',
      icon: 'music-note' as const,
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#667eea', '#764ba2'],
      screen: 'Tuneo'
    },
    {
      id: 'pitchbird',
      title: 'Pitch Bird',
      subtitle: 'Voice-controlled game (requires tuner)',
      icon: 'gamepad-variant' as const,
      iconFamily: 'MaterialCommunityIcons',
      colors: ['#f093fb', '#f5576c'],
      screen: 'FlappyBird'
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'Configure app preferences',
      icon: 'cog' as const,
      iconFamily: 'Ionicons',
      colors: ['#4facfe', '#00f2fe'],
      screen: 'Settings'
    },
  ]
  
  const renderIcon = (item: typeof menuItems[0]) => {
    switch(item.iconFamily) {
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={item.icon as any} size={40} color="#fff" />
      case 'Ionicons':
        return <Ionicons name={item.icon as any} size={40} color="#fff" />
      default:
        return <MaterialCommunityIcons name={item.icon as any} size={40} color="#fff" />
    }
  }
  
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>Tuneo</Text>
        <Text style={styles.appSubtitle}>Musical Training & Games</Text>
      </View>
      
      {/* Menu Items */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.menuCard,
                { width: width > 400 ? (width - 60) / 2 : width - 40 }
              ]}
              onPress={() => navigation.navigate(item.screen as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.iconContainer}>
                  {renderIcon(item)}
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Future Games Section */}
        <View style={styles.comingSoonSection}>
          <Text style={styles.sectionTitle}>More Games Coming Soon</Text>
          <View style={styles.comingSoonGrid}>
            <View style={[styles.comingSoonCard, { width: width > 400 ? (width - 60) / 2 : width - 40 }]}>
              <MaterialCommunityIcons name="piano" size={30} color="#666" />
              <Text style={styles.comingSoonText}>Rhythm Master</Text>
              <Text style={styles.comingSoonSubtext}>Test your timing</Text>
            </View>
            <View style={[styles.comingSoonCard, { width: width > 400 ? (width - 60) / 2 : width - 40 }]}>
              <MaterialCommunityIcons name="ear-hearing" size={30} color="#666" />
              <Text style={styles.comingSoonText}>Ear Training</Text>
              <Text style={styles.comingSoonSubtext}>Interval recognition</Text>
            </View>
            <View style={[styles.comingSoonCard, { width: width > 400 ? (width - 60) / 2 : width - 40 }]}>
              <FontAwesome5 name="guitar" size={30} color="#666" />
              <Text style={styles.comingSoonText}>Chord Challenge</Text>
              <Text style={styles.comingSoonSubtext}>Learn chord progressions</Text>
            </View>
            <View style={[styles.comingSoonCard, { width: width > 400 ? (width - 60) / 2 : width - 40 }]}>
              <MaterialCommunityIcons name="metronome" size={30} color="#666" />
              <Text style={styles.comingSoonText}>Tempo Trainer</Text>
              <Text style={styles.comingSoonSubtext}>Master your tempo</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  appTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 20,
  },
  menuCard: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  textContainer: {
    gap: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  comingSoonSection: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  comingSoonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
  },
  comingSoonCard: {
    height: 120,
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    opacity: 0.6,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  comingSoonSubtext: {
    fontSize: 11,
    color: '#444',
    marginTop: 2,
  },
})