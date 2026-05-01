import { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  FileUp, Sparkles, BookOpen, HelpCircle, ListChecks, Video,
  FileText, Loader2, ChevronDown, ChevronUp, AlertCircle,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

type Section = 'questions' | 'quiz' | 'mcq' | 'videos' | 'summary';

interface GeneratedContent {
  questions?: string;
  quiz?: string;
  mcq?: string;
  videos?: string;
  summary?: string;
}

export default function ExamTime() {
  const [syllabusText, setSyllabusText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploaded, setIsUploaded] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent>({});
  const [loadingSection, setLoadingSection] = useState<Section | null>(null);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanText = (text: string) =>
    text
      .replace(/\u0000/g, ' ')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const extractTextFromDoc = async (file: File) => {
    // .doc files are binary, so we can't reliably extract text from them
    // Fall back to a warning message
    console.warn('Exam Time: .doc files are not supported. Please use .docx or .txt files.');
    throw new Error('.doc files are not supported. Please convert to .docx or use a .txt file.');
  };

  const extractTextFromDocx = async (file: File) => {
    try {
      console.log('Exam Time: Extracting text from .docx file');
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const docFile = zip.file('word/document.xml');
      if (!docFile) {
        throw new Error('Invalid .docx file: missing document.xml');
      }

      const xmlText = await docFile.async('text');
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
      const textNodes = Array.from(xmlDoc.getElementsByTagName('w:t'));
      const extractedText = textNodes.map((node) => node.textContent || '').join(' ');
      console.log('Exam Time: Extracted text length from .docx:', extractedText.length);
      return cleanText(extractedText);
    } catch (error) {
      console.error('Exam Time: Failed to extract text from .docx:', error);
      throw new Error('Failed to read .docx file. Please try a .txt file instead.');
    }
  };

  const readSyllabusFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    console.log('Exam Time: Processing file with extension:', extension);

    if (extension === 'docx') {
      return extractTextFromDocx(file);
    }
    if (extension === 'doc') {
      return extractTextFromDoc(file);
    }
    if (extension === 'txt' || extension === 'md') {
      const text = await file.text();
      console.log('Exam Time: Read text file, length:', text.length);
      return cleanText(text);
    }

    throw new Error(`Unsupported file type: .${extension}. Please use .txt, .md, or .docx files.`);
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('Exam Time: File selected:', file.name, 'Size:', file.size);
    setFileName(file.name);

    const allowedExtensions = ['txt', 'md', 'docx'];
    const bannedExtensions = ['exe', 'js', 'html', 'bat', 'cmd', 'zip'];
    const maxFileSize = 5 * 1024 * 1024;
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (file.size > maxFileSize) {
      toast.error('File too large. Please upload a file smaller than 5MB.');
      return;
    }

    if (!extension || bannedExtensions.includes(extension) || !allowedExtensions.includes(extension)) {
      toast.error('Unsupported file type. Upload only .txt, .md, or .docx files.');
      return;
    }

    if (file.type && !['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'].includes(file.type)) {
      toast.error('Unsupported file format. Please upload .txt, .md, or .docx.');
      return;
    }

    try {
      const text = await readSyllabusFile(file);
      if (text && text.trim().length > 0) {
        console.log('Exam Time: Successfully extracted text, length:', text.length);
        setSyllabusText(text.trim());
        setIsUploaded(true);
        setGeneratedContent({});
        setActiveSection(null);
        toast.success('Syllabus uploaded successfully!');
      } else {
        console.warn('Exam Time: No text content extracted from file');
        toast.error('Could not extract text from this file. Please ensure it contains readable text.');
      }
    } catch (error: any) {
      console.error('Exam Time: File upload failed:', error);
      toast.error(error.message || 'Failed to read syllabus file.');
    }
  }, []);

  const generateSection = useCallback(async (section: Section) => {
    if (!syllabusText) return;
    setLoadingSection(section);
    setActiveSection(section);

    const syllabusContent = syllabusText.slice(0, 8000);
    const payload = { syllabusContent, section, subject: fileName };

    try {
      console.log('Exam Time: selected section', section);
      console.log('Exam Time: syllabusContent length', syllabusContent.length);
      console.log('Exam Time: request payload', payload);

      const response = await fetch(`${API_BASE_URL}/api/exam-time-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('Exam Time: backend response status', response.status);
      const data = await response.json();
      console.log('Exam Time: backend response data', data);

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to generate content');
      }

      if (!data?.result) {
        throw new Error('No content received from AI service');
      }

      setGeneratedContent(prev => ({ ...prev, [section]: data.result }));
    } catch (err: any) {
      console.error('Exam Time generation failed:', err);
      toast.error(`Failed to generate: ${err?.message || 'Unknown error occurred'}`);
    } finally {
      setLoadingSection(null);
    }
  }, [syllabusText]);

  const sections: { key: Section; label: string; icon: React.ReactNode; desc: string }[] = [
    { key: 'questions', label: 'Important Q&A', icon: <HelpCircle className="w-4 h-4" />, desc: 'Key exam questions with answers' },
    { key: 'quiz', label: 'Quick Quiz', icon: <ListChecks className="w-4 h-4" />, desc: 'Short questions with hidden answers' },
    { key: 'mcq', label: '20 MCQs', icon: <BookOpen className="w-4 h-4" />, desc: 'Multiple choice questions' },
    { key: 'videos', label: 'Video Resources', icon: <Video className="w-4 h-4" />, desc: 'Suggested YouTube videos' },
    { key: 'summary', label: 'Revision Summary', icon: <FileText className="w-4 h-4" />, desc: 'Topic-wise revision notes' },
  ];

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-8rem)] gap-0 -my-4">
        {/* Sidebar */}
        <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h2 className="font-semibold text-sm">Exam Time</h2>
                <p className="text-xs text-muted-foreground">AI Exam Prep</p>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-2 flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Study Materials</p>
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => {
                  if (generatedContent[s.key]) {
                    setActiveSection(s.key);
                  } else if (isUploaded) {
                    generateSection(s.key);
                  }
                }}
                disabled={!isUploaded || loadingSection === s.key}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors disabled:opacity-50 ${
                  activeSection === s.key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {loadingSection === s.key ? <Loader2 className="w-4 h-4 animate-spin" /> : s.icon}
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.label}</div>
                  <div className={`text-[10px] ${activeSection === s.key ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{s.desc}</div>
                </div>
                {generatedContent[s.key] && (
                  <Badge variant="secondary" className="ml-auto text-[9px] px-1.5">✓</Badge>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Exam Preparation Assistant</h2>
              <p className="text-xs text-muted-foreground">Upload your syllabus to generate study materials</p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-6 py-8">
              {!isUploaded ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileUp className="w-10 h-10 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-xl mb-2">Upload Your Syllabus</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      Upload a text file (.txt) containing your exam syllabus topics. The AI will generate study materials based on it.
                    </p>
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button size="lg" className="gradient-primary hover:opacity-90" onClick={() => fileInputRef.current?.click()}>
                      <FileUp className="w-5 h-5 mr-2" />
                      Choose Syllabus File
                    </Button>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-muted-foreground bg-accent/50 rounded-lg p-3 max-w-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Supported formats: .txt, .md, .docx — Paste syllabus content as plain text for best results.</span>
                  </div>
                </div>
              ) : activeSection && generatedContent[activeSection] ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className="gradient-primary text-primary-foreground">
                      {sections.find(s => s.key === activeSection)?.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Generated from: {fileName}</span>
                  </div>
                  <div className="prose prose-lg max-w-none dark:prose-invert break-words leading-8">
                    <ReactMarkdown
                      components={{
                        a: ({ node, ...props }) => (
                          <a {...props} target="_blank" rel="noreferrer" className="text-primary underline" />
                        ),
                      }}
                    >
                      {generatedContent[activeSection]!}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : loadingSection ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-muted-foreground text-sm">Generating {sections.find(s => s.key === loadingSection)?.label}...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg mb-2">Syllabus Loaded!</h3>
                    <p className="text-muted-foreground text-sm">
                      Select a study material type from the sidebar to generate content from <strong>{fileName}</strong>.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {sections.map(s => (
                      <Button key={s.key} variant="outline" size="sm" onClick={() => generateSection(s.key)}>
                        {s.icon}
                        <span className="ml-1">{s.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </DashboardLayout>
  );
}
