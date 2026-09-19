import PropTypes from 'prop-types';
import { useEffect } from 'react';

import { collectionShape, pageContextShape } from '../../../utils/itemShape';

import Listing from './Listing';

const HomePage = ({ collections, context }) => {
  useEffect(() => {
    document.title = context.appName;
  }, [context.appName]);

  return <Listing collections={collections} org="" member={false} grouped context={context} />;
};

HomePage.propTypes = {
  collections: PropTypes.arrayOf(collectionShape).isRequired,
  context: pageContextShape.isRequired,
};

export default HomePage;
