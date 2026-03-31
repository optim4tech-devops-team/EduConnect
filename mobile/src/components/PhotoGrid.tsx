import React from 'react';
import {
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  View,
} from 'react-native';
import Colors from '../../theme/colors';

interface Photo {
  id: string;
  mediaUrl: string;
  caption?: string;
}

interface PhotoGridProps {
  photos: Photo[];
  onPress: (photo: Photo) => void;
}

const ITEM_SIZE = Dimensions.get('window').width / 3;

const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onPress }) => {
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={3}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.cell}
          onPress={() => onPress(item)}
          activeOpacity={0.85}
        >
          <Image source={{ uri: item.mediaUrl }} style={styles.image} />
        </TouchableOpacity>
      )}
      ListEmptyComponent={<View style={styles.empty} />}
    />
  );
};

const styles = StyleSheet.create({
  cell: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 1,
  },
  image: {
    flex: 1,
    backgroundColor: Colors.BORDER,
  },
  empty: {
    height: 100,
  },
});

export default PhotoGrid;
