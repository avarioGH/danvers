'use client'
import { useState, useEffect } from 'react'
import { Flame, Droplets, Plus, TrendingUp, UtensilsCrossed, X, Trash2, Clock, Camera, Loader2 } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts'
import { createClient } from '@/lib/supabase/client'

export default function NutritionPage() {
  const [meals, setMeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [water, setWater] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [newMeal, setNewMeal] = useState({
    food_name: '',
    meal_type: 'breakfast',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fats_g: 0
  })

  const supabase = createClient()
  const today = new Date().toLocaleDateString('en-CA')

  useEffect(() => {
    fetchNutrition()
  }, [])

  const fetchNutrition = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('log_date', today)
        .order('logged_at', { ascending: true })
      
      if (error) throw error
      setMeals(data || [])
    } catch (err) {
      console.error('Error fetching nutrition:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAnalyzingImage(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1]
        
        let apiKey = ''
        try {
          const savedConfig = localStorage.getItem('danvers_config')
          if (savedConfig) apiKey = JSON.parse(savedConfig).geminiKey || ''
        } catch (e) {}

        const response = await fetch('/api/nutrition/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64String,
            mimeType: file.type,
            apiKey
          })
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || 'Analysis failed')
        }

        const data = await response.json()
        setNewMeal(prev => ({
          ...prev,
          food_name: data.food_name || prev.food_name,
          calories: data.calories || 0,
          protein_g: data.protein_g || 0,
          carbs_g: data.carbs_g || 0,
          fats_g: data.fats_g || 0
        }))
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to analyze image.")
    } finally {
      setAnalyzingImage(false)
      // Reset the file input so the same file can be selected again if needed
      e.target.value = ''
    }
  }

  const handleAddMeal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('meal_logs')
        .insert({
          ...newMeal,
          user_id: user.id,
          log_date: today
        })
      
      if (error) throw error
      setShowAddModal(false)
      setNewMeal({ food_name: '', meal_type: 'breakfast', calories: 0, protein_g: 0, carbs_g: 0, fats_g: 0 })
      fetchNutrition()
    } catch (err) {
      console.error('Error adding meal:', err)
    }
  }

  const deleteMeal = async (id: string) => {
    try {
      await supabase.from('meal_logs').delete().eq('id', id)
      fetchNutrition()
    } catch (err) {
      console.error('Error deleting meal:', err)
    }
  }

  const totalKcal = meals.reduce((sum, m) => sum + (m.calories || 0), 0)
  const totalProtein = meals.reduce((sum, m) => sum + (m.protein_g || 0), 0)
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbs_g || 0), 0)
  const totalFats = meals.reduce((sum, m) => sum + (m.fats_g || 0), 0)

  const macroData = [
    { name: 'Protein', value: totalProtein, color: '#00d4ff', goal: 200 },
    { name: 'Carbs', value: totalCarbs, color: '#ffb800', goal: 300 },
    { name: 'Fats', value: totalFats, color: '#a855f7', goal: 80 },
  ]

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-label" style={{ marginBottom: 4 }}>NUTRITION OPTIMIZATION SYSTEM</div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: '#e8f4ff' }}>Nutrition Matrix</h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ fontSize: 13 }}>
          <Plus size={14} />Log Food
        </button>
      </div>

      {/* Summary row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Calories', value: totalKcal, unit: 'kcal', goal: 2400, color: '#ffb800', icon: Flame },
          { label: 'Protein', value: totalProtein.toFixed(0), unit: 'g', goal: 200, color: '#00d4ff', icon: TrendingUp },
          { label: 'Hydration', value: water.toFixed(1), unit: 'L', goal: 3.5, color: '#1a6fff', icon: Droplets },
          { label: 'Meals Logged', value: meals.length, unit: '/ day', goal: 5, color: '#00ff88', icon: UtensilsCrossed },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: 16 }}>
            <s.icon size={16} style={{ color: s.color, marginBottom: 8 }} />
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 700, color: s.color }}>
              {s.value}<span style={{ fontSize: 11, color: '#4a6580', marginLeft: 3 }}>{s.unit}</span>
            </div>
            <div style={{ fontSize: 11, color: '#4a6580', marginTop: 3 }}>Goal: {s.goal}{s.unit}</div>
            <div className="progress-bar" style={{ marginTop: 8 }}>
              <div className="progress-fill" style={{ width: `${Math.min(100, (Number(s.value) / s.goal) * 100)}%`, background: `linear-gradient(90deg, ${s.color}88, ${s.color})` }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Macro pie */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', marginBottom: 16, letterSpacing: '0.05em' }}>MACRO BREAKDOWN</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={macroData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {macroData.map((_, i) => <Cell key={i} fill={macroData[i].color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'rgba(4,15,30,0.95)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {macroData.map((m, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color }} />
                      <span style={{ fontSize: 12, color: '#8bacc8' }}>{m.name}</span>
                    </div>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: m.color }}>{m.value.toFixed(0)}g</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min(100, (m.value / m.goal) * 100)}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#2a3a4a', marginTop: 2, textAlign: 'right' }}>Goal: {m.goal}g</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info panel */}
        <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(0,212,255,0.05), transparent)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
             <TrendingUp size={18} style={{ color: '#00ff88' }} />
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, color: '#e8f4ff' }}>METABOLIC STATUS</h2>
           </div>
           <p style={{ fontSize: 13, color: '#8bacc8', lineHeight: 1.6, marginBottom: 20 }}>
             All systems are operating within optimal range. Protein intake is at {Math.round(totalProtein / 200 * 100)}% of daily requirement for muscle preservation.
           </p>
           <div style={{ padding: 12, background: 'rgba(0,212,255,0.03)', borderRadius: 8, border: '1px solid rgba(0,212,255,0.1)' }}>
             <div style={{ fontSize: 11, color: '#4a6580', marginBottom: 4 }}>AI RECOMMENDATION</div>
             <div style={{ fontSize: 12, color: '#00d4ff' }}>"Increase hydration by 1.1L before 20:00 to support evening recovery protocols."</div>
           </div>
        </div>
      </div>

      {/* Meal log list */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#e8f4ff', letterSpacing: '0.05em', marginBottom: 20 }}>MEAL LOG</h2>
        {loading ? (
           <p style={{ color: '#4a6580', textAlign: 'center' }}>Scanning data...</p>
        ) : meals.length === 0 ? (
           <p style={{ color: '#4a6580', textAlign: 'center' }}>No meals logged today.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {meals.map(meal => (
              <div key={meal.id} style={{ padding: 16, background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.08)', borderRadius: 12, position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: '#e8f4ff', fontSize: 14 }}>{meal.food_name}</span>
                  <button onClick={() => deleteMeal(meal.id)} style={{ background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><Trash2 size={14} /></button>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ padding: '4px 8px', background: 'rgba(255,184,0,0.1)', borderRadius: 6, fontSize: 11, color: '#ffb800' }}>{meal.calories} kcal</div>
                  <div style={{ padding: '4px 8px', background: 'rgba(0,212,255,0.1)', borderRadius: 6, fontSize: 11, color: '#00d4ff' }}>{meal.protein_g}g P</div>
                  <div style={{ padding: '4px 8px', background: 'rgba(168,85,247,0.1)', borderRadius: 6, fontSize: 11, color: '#a855f7' }}>{meal.carbs_g}g C</div>
                  <div style={{ padding: '4px 8px', background: 'rgba(0,255,136,0.1)', borderRadius: 6, fontSize: 11, color: '#00ff88' }}>{meal.fats_g}g F</div>
                </div>
                <div style={{ fontSize: 10, color: '#4a6580', marginTop: 12, textTransform: 'uppercase' }}>{meal.meal_type}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Meal Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)} />
          <div className="glass-card animate-fade-scale" style={{ width: '100%', maxWidth: 450, padding: 32, position: 'relative' }}>
             <button onClick={() => setShowAddModal(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: '#4a6580', cursor: 'pointer' }}><X size={20} /></button>
             <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, color: '#e8f4ff', marginBottom: 24 }}>LOG NUTRITION DATA</h2>
             
             {/* AI Scan Button */}
             <div style={{ marginBottom: 20 }}>
                <input type="file" id="food-image" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleImageUpload} />
                <label htmlFor="food-image" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', background: 'rgba(0,212,255,0.05)', border: '1px dashed rgba(0,212,255,0.4)', borderRadius: 10, color: '#00d4ff', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {analyzingImage ? (
                    <><Loader2 size={16} className="animate-spin" /> Scanning with DANVERS Vision...</>
                  ) : (
                    <><Camera size={16} /> Auto-Scan Food with AI</>
                  )}
                </label>
             </div>

             <form onSubmit={handleAddMeal} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>FOOD NAME / MEAL</label>
                 <input className="danvers-input" value={newMeal.food_name} onChange={e => setNewMeal({...newMeal, food_name: e.target.value})} placeholder="e.g. Grilled Salmon & Rice" required />
               </div>
               <div>
                 <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>TYPE</label>
                 <select className="danvers-input" value={newMeal.meal_type} onChange={e => setNewMeal({...newMeal, meal_type: e.target.value})}>
                   <option value="breakfast">BREAKFAST</option>
                   <option value="lunch">LUNCH</option>
                   <option value="dinner">DINNER</option>
                   <option value="snack">SNACK</option>
                 </select>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CALORIES (KCAL)</label>
                   <input type="number" className="danvers-input" value={newMeal.calories} onChange={e => setNewMeal({...newMeal, calories: parseInt(e.target.value) || 0})} />
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>PROTEIN (G)</label>
                   <input type="number" className="danvers-input" value={newMeal.protein_g} onChange={e => setNewMeal({...newMeal, protein_g: parseInt(e.target.value) || 0})} />
                 </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>CARBS (G)</label>
                   <input type="number" className="danvers-input" value={newMeal.carbs_g} onChange={e => setNewMeal({...newMeal, carbs_g: parseInt(e.target.value) || 0})} />
                 </div>
                 <div>
                   <label style={{ display: 'block', fontSize: 11, color: '#4a6580', marginBottom: 6 }}>FATS (G)</label>
                   <input type="number" className="danvers-input" value={newMeal.fats_g} onChange={e => setNewMeal({...newMeal, fats_g: parseInt(e.target.value) || 0})} />
                 </div>
               </div>
               <button type="submit" className="btn-primary" style={{ marginTop: 12, justifyContent: 'center', padding: 12 }}>INITIALIZE DATA ENTRY</button>
             </form>
          </div>
        </div>
      )}
    </div>
  )
}
