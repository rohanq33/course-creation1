#!/usr/bin/env node

/**
 * Test script to verify Supabase Edge Functions are working
 * Run with: node test-functions.js
 */

const { createClient } = require('@supabase/supabase-js')

// You'll need to set these environment variables or replace with your values
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mgpfzejqhalirbcysdne.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testExamTimeFunction() {
  console.log('🧪 Testing Exam Time function...')

  try {
    const { data, error } = await supabase.functions.invoke('exam-time-generate', {
      body: {
        syllabusContent: 'Introduction to Machine Learning, Neural Networks, Deep Learning, Computer Vision',
        section: 'questions'
      }
    })

    if (error) {
      console.error('❌ Exam Time function failed:', error.message)
      return false
    }

    if (!data?.result) {
      console.error('❌ Exam Time function returned no result')
      return false
    }

    console.log('✅ Exam Time function working! Generated content length:', data.result.length)
    return true
  } catch (err) {
    console.error('❌ Exam Time function error:', err.message)
    return false
  }
}

async function testStudentTimeFunction() {
  console.log('🧪 Testing Student Time function...')

  try {
    const { data, error } = await supabase.functions.invoke('student-time-generate', {
      body: {
        topic: 'Machine Learning',
        resourceType: 'quiz'
      }
    })

    if (error) {
      console.error('❌ Student Time function failed:', error.message)
      return false
    }

    if (!data?.result) {
      console.error('❌ Student Time function returned no result')
      return false
    }

    console.log('✅ Student Time function working! Generated content length:', data.result.length)
    return true
  } catch (err) {
    console.error('❌ Student Time function error:', err.message)
    return false
  }
}

async function main() {
  console.log('🚀 Testing Supabase Edge Functions for AI Course Developer\n')

  const examTimeOk = await testExamTimeFunction()
  console.log('')

  const studentTimeOk = await testStudentTimeFunction()
  console.log('')

  if (examTimeOk && studentTimeOk) {
    console.log('🎉 All functions are working correctly!')
    process.exit(0)
  } else {
    console.log('💥 Some functions failed. Check your Supabase configuration.')
    process.exit(1)
  }
}

main().catch(console.error)