-- Draft learning samples. Review before marking as reviewed.
insert into public.vocabulary_localizations (english_word,language,translation,examples,status) values
('apple','hi','सेब','[{"english":"She eats an apple every day.","translation":"वह हर दिन एक सेब खाती है।"}]'::jsonb,'draft'),
('water','hi','पानी','[{"english":"Please drink some water.","translation":"कृपया थोड़ा पानी पिएँ।"}]'::jsonb,'draft'),
('book','hi','किताब','[{"english":"This book is very interesting.","translation":"यह किताब बहुत दिलचस्प है।"}]'::jsonb,'draft'),
('learn','hi','सीखना','[{"english":"I want to learn English.","translation":"मैं अंग्रेज़ी सीखना चाहता हूँ।"}]'::jsonb,'draft'),
('school','hi','स्कूल','[{"english":"The children are at school.","translation":"बच्चे स्कूल में हैं।"}]'::jsonb,'draft'),
('friend','hi','दोस्त','[{"english":"She is my friend.","translation":"वह मेरी दोस्त है।"}]'::jsonb,'draft'),
('beautiful','hi','सुंदर','[{"english":"This is a beautiful garden.","translation":"यह एक सुंदर बगीचा है।"}]'::jsonb,'draft'),
('read','hi','पढ़ना','[{"english":"The children read books.","translation":"बच्चे किताबें पढ़ते हैं।"}]'::jsonb,'draft')
on conflict (english_word,language) do nothing;
