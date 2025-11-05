"""
Intent detection service using Sentence-BERT for natural language processing
"""

import logging
import time
import re
from typing import Dict, List, Any, Optional
import numpy as np
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class IntentService:
    """Service for processing natural language queries and extracting intent"""
    
    def __init__(self):
        self.model = None
        self.model_name = "all-MiniLM-L6-v2"
        self.is_initialized = False
    
    async def initialize(self):
        """Initialize the Sentence-BERT model"""
        try:
            logger.info(f"Loading Sentence-BERT model: {self.model_name}")
            start_time = time.time()
            
            # Load the pre-trained model
            self.model = SentenceTransformer(self.model_name)
            
            load_time = time.time() - start_time
            logger.info(f"Model loaded successfully in {load_time:.2f} seconds")
            
            # Test the model with a simple query
            test_embedding = self.model.encode("test query")
            logger.info(f"Model test successful. Embedding dimension: {len(test_embedding)}")
            
            self.is_initialized = True
            
        except Exception as e:
            logger.error(f"Failed to initialize Sentence-BERT model: {e}")
            raise
    
    def check_model_health(self) -> bool:
        """Check if the model is loaded and functioning"""
        try:
            if not self.is_initialized or self.model is None:
                return False
            
            # Test with a simple encoding
            test_text = "health check"
            embedding = self.model.encode(test_text)
            return len(embedding) > 0
            
        except Exception as e:
            logger.error(f"Model health check failed: {e}")
            return False
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate semantic embedding for given text"""
        if not self.is_initialized:
            raise RuntimeError("Intent service not initialized")
        
        try:
            # Clean and preprocess text
            cleaned_text = self._preprocess_text(text)
            
            # Generate embedding
            embedding = self.model.encode(cleaned_text)
            
            # Convert to list for JSON serialization
            return embedding.tolist()
            
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    def extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        # Simple keyword extraction - can be enhanced with more sophisticated NLP
        text = text.lower()
        
        # Remove common stop words (basic implementation)
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must',
            'ที่', 'และ', 'หรือ', 'แต่', 'ใน', 'บน', 'ที่', 'เพื่อ', 'ของ', 'กับ', 'โดย',
            'ฉัน', 'คุณ', 'เขา', 'เธอ', 'มัน', 'เรา', 'พวกเขา',
            'เป็น', 'คือ', 'มี', 'ได้', 'จะ', 'ควร', 'อาจ', 'สามารถ'
        }
        
        # Extract words (basic tokenization)
        words = re.findall(r'\b\w+\b', text)
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Remove duplicates while preserving order
        seen = set()
        unique_keywords = []
        for keyword in keywords:
            if keyword not in seen:
                seen.add(keyword)
                unique_keywords.append(keyword)
        
        return unique_keywords[:10]  # Limit to top 10 keywords
    
    def extract_price_range(self, text: str) -> Optional[Dict[str, float]]:
        """Extract price range from text"""
        text = text.lower()
        
        # Price patterns (Thai and English)
        price_patterns = [
            r'งบ.*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ล้าน|million|m)',  # Thai: งบ X ล้าน
            r'ราคา.*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ล้าน|million|m)',  # Thai: ราคา X ล้าน
            r'budget.*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|m)',  # English: budget X million
            r'price.*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|m)',  # English: price X million
            r'(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ล้าน|million|m)',  # Direct: X million
            r'ไม่เกิน.*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:ล้าน|million|m)',  # Thai: not exceed X million
            r'under.*?(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:million|m)',  # English: under X million
        ]
        
        for pattern in price_patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    # Convert to float (remove commas)
                    price = float(matches[0].replace(',', ''))
                    
                    # Convert millions to actual amount
                    price_amount = price * 1_000_000
                    
                    # Determine if it's a max price (ไม่เกิน, under) or general budget
                    if 'ไม่เกิน' in text or 'under' in text or 'below' in text:
                        return {'max': price_amount}
                    else:
                        # Assume it's a target budget with some flexibility
                        return {
                            'min': price_amount * 0.8,  # 20% below
                            'max': price_amount * 1.2   # 20% above
                        }
                except ValueError:
                    continue
        
        return None
    
    def extract_location_hints(self, text: str) -> List[str]:
        """Extract location-related keywords from text"""
        text = text.lower()
        
        # Location-related keywords
        location_keywords = []
        
        # Thai location terms
        thai_locations = re.findall(r'(?:ใกล้|แถว|ย่าน|เขต|จังหวัด|อำเภอ|ตำบล)\s*([^\s]+)', text)
        location_keywords.extend(thai_locations)
        
        # English location terms
        eng_locations = re.findall(r'(?:near|around|in|at|close to)\s+([a-zA-Z\s]+?)(?:\s|$|,)', text)
        location_keywords.extend([loc.strip() for loc in eng_locations])
        
        # Common Bangkok areas and landmarks
        bangkok_areas = [
            'สุขุมวิท', 'สีลม', 'สาทร', 'อโศก', 'ชิดลม', 'ราชดำริ', 'ลาดพร้าว', 'รามคำแหง',
            'บางนา', 'ลาดกระบัง', 'มีนบุรี', 'สายไหม', 'ดอนเมือง', 'บางซื่อ', 'จตุจักร',
            'sukhumvit', 'silom', 'sathorn', 'asok', 'chidlom', 'ratchadamri', 'ladprao',
            'ramkhamhaeng', 'bangna', 'lat krabang', 'min buri', 'sai mai', 'don mueang',
            'bang sue', 'chatuchak', 'bts', 'mrt', 'airport'
        ]
        
        for area in bangkok_areas:
            if area in text:
                location_keywords.append(area)
        
        return list(set(location_keywords))  # Remove duplicates
    
    def extract_property_type(self, text: str) -> Optional[List[str]]:
        """Extract property type preferences from text"""
        text = text.lower()
        property_types = []
        
        # Thai property types
        thai_types = {
            'บ้าน': 'house',
            'คอนโด': 'condo',
            'ทาวน์เฮาส์': 'townhouse',
            'ทาวน์โฮม': 'townhouse',
            'ที่ดิน': 'land',
            'อพาร์ตเมนต์': 'condo'
        }
        
        # English property types
        eng_types = {
            'house': 'house',
            'condo': 'condo',
            'condominium': 'condo',
            'townhouse': 'townhouse',
            'townhome': 'townhouse',
            'land': 'land',
            'apartment': 'condo'
        }
        
        # Check for Thai types
        for thai_type, eng_type in thai_types.items():
            if thai_type in text:
                property_types.append(eng_type)
        
        # Check for English types
        for eng_type, normalized_type in eng_types.items():
            if eng_type in text:
                property_types.append(normalized_type)
        
        return list(set(property_types)) if property_types else None
    
    def extract_area_requirements(self, text: str) -> Optional[Dict[str, float]]:
        """Extract area/size requirements from text"""
        text = text.lower()
        
        # Area patterns
        area_patterns = [
            r'(\d+(?:\.\d+)?)\s*(?:ตร\.?ม\.?|sqm|square\s*meters?)',  # X sqm
            r'พื้นที่.*?(\d+(?:\.\d+)?)\s*(?:ตร\.?ม\.?|sqm)',  # Area X sqm
            r'ขนาด.*?(\d+(?:\.\d+)?)\s*(?:ตร\.?ม\.?|sqm)',  # Size X sqm
        ]
        
        for pattern in area_patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    area = float(matches[0])
                    # Return as minimum area requirement
                    return {'min': area}
                except ValueError:
                    continue
        
        return None
    
    def extract_room_requirements(self, text: str) -> Optional[Dict[str, int]]:
        """Extract room requirements from text"""
        text = text.lower()
        rooms = {}
        
        # Bedroom patterns
        bedroom_patterns = [
            r'(\d+)\s*(?:ห้องนอน|bedroom|bed)',
            r'(?:ห้องนอน|bedroom|bed)\s*(\d+)',
        ]
        
        for pattern in bedroom_patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    rooms['bedrooms'] = int(matches[0])
                    break
                except ValueError:
                    continue
        
        # Bathroom patterns
        bathroom_patterns = [
            r'(\d+)\s*(?:ห้องน้ำ|bathroom|bath)',
            r'(?:ห้องน้ำ|bathroom|bath)\s*(\d+)',
        ]
        
        for pattern in bathroom_patterns:
            matches = re.findall(pattern, text)
            if matches:
                try:
                    rooms['bathrooms'] = int(matches[0])
                    break
                except ValueError:
                    continue
        
        return rooms if rooms else None
    
    def calculate_confidence_score(self, extracted_data: Dict[str, Any]) -> float:
        """Calculate confidence score based on extracted data completeness"""
        score = 0.0
        max_score = 6.0  # Maximum possible score
        
        # Score based on what we successfully extracted
        if extracted_data.get('keywords'):
            score += 1.0
        if extracted_data.get('price_range'):
            score += 1.5
        if extracted_data.get('location_hints'):
            score += 1.5
        if extracted_data.get('property_type'):
            score += 1.0
        if extracted_data.get('area_requirements'):
            score += 0.5
        if extracted_data.get('room_requirements'):
            score += 0.5
        
        return min(score / max_score, 1.0)
    
    def generate_intent_summary(self, query: str, extracted_data: Dict[str, Any]) -> str:
        """Generate human-readable intent summary"""
        summary_parts = []
        
        # Property type
        if extracted_data.get('property_type'):
            types = ', '.join(extracted_data['property_type'])
            summary_parts.append(f"Looking for {types}")
        else:
            summary_parts.append("Looking for property")
        
        # Price range
        if extracted_data.get('price_range'):
            price_range = extracted_data['price_range']
            if 'max' in price_range and 'min' not in price_range:
                summary_parts.append(f"under {price_range['max']:,.0f} THB")
            elif 'min' in price_range and 'max' in price_range:
                summary_parts.append(f"between {price_range['min']:,.0f}-{price_range['max']:,.0f} THB")
        
        # Location
        if extracted_data.get('location_hints'):
            locations = ', '.join(extracted_data['location_hints'][:2])  # Limit to first 2
            summary_parts.append(f"near {locations}")
        
        # Rooms
        if extracted_data.get('room_requirements'):
            rooms = extracted_data['room_requirements']
            room_parts = []
            if 'bedrooms' in rooms:
                room_parts.append(f"{rooms['bedrooms']} bedroom(s)")
            if 'bathrooms' in rooms:
                room_parts.append(f"{rooms['bathrooms']} bathroom(s)")
            if room_parts:
                summary_parts.append(', '.join(room_parts))
        
        return '; '.join(summary_parts) if summary_parts else "General property search"
    
    async def process_intent(self, query: str) -> Dict[str, Any]:
        """Process natural language query and extract complete intent"""
        if not self.is_initialized:
            raise RuntimeError("Intent service not initialized")
        
        start_time = time.time()
        
        try:
            # Extract all components
            keywords = self.extract_keywords(query)
            price_range = self.extract_price_range(query)
            location_hints = self.extract_location_hints(query)
            property_type = self.extract_property_type(query)
            area_requirements = self.extract_area_requirements(query)
            room_requirements = self.extract_room_requirements(query)
            
            # Generate embedding
            embedding = self.generate_embedding(query)
            
            # Compile extracted data
            extracted_data = {
                'keywords': keywords,
                'price_range': price_range,
                'location_hints': location_hints,
                'property_type': property_type,
                'area_requirements': area_requirements,
                'room_requirements': room_requirements
            }
            
            # Remove None values
            extracted_filters = {k: v for k, v in extracted_data.items() if v is not None}
            
            # Calculate confidence and generate summary
            confidence_score = self.calculate_confidence_score(extracted_filters)
            intent_summary = self.generate_intent_summary(query, extracted_filters)
            
            processing_time = time.time() - start_time
            
            return {
                'keywords': keywords,
                'extracted_filters': extracted_filters,
                'embedding': embedding,
                'confidence_score': confidence_score,
                'processing_time': processing_time,
                'intent_summary': intent_summary
            }
            
        except Exception as e:
            logger.error(f"Failed to process intent: {e}")
            raise
    
    def calculate_cosine_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            # Convert to numpy arrays
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Failed to calculate similarity: {e}")
            raise
    
    def _preprocess_text(self, text: str) -> str:
        """Clean and preprocess text for better embedding generation"""
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove special characters but keep Thai characters
        text = re.sub(r'[^\w\s\u0E00-\u0E7F]', ' ', text)
        
        return text