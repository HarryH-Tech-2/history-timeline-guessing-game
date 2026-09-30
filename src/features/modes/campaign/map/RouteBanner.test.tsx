import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CAMPAIGN } from '../campaignMap';
import { routeLane } from './constants';
import { RouteBanner } from './RouteBanner';

describe('RouteBanner', () => {
  const routes = CAMPAIGN.flatMap((w) => w.routes);
  const longest = routes.reduce((a, b) => (b.name.length > a.name.length ? b : a));

  it('keeps even the longest route name on one shrinking line inside a 320dp lane', () => {
    expect(longest.name).toBe('Renaissance & Reformation');
    const lane = routeLane(1, 320);
    expect(Math.round(lane.width)).toBe(138);
    render(
      <RouteBanner
        route={longest}
        colour="#7A4B9C"
        earned={4}
        total={9}
        left={lane.left}
        top={0}
        width={lane.width}
      />,
    );
    const banner = screen.getByTestId(`route-${longest.id}`);
    const box = StyleSheet.flatten(banner.props.style);
    expect(box).toMatchObject({ left: lane.left, width: lane.width, overflow: 'hidden' });

    const name = screen.getByText(`${longest.icon} ${longest.name}`);
    expect(name).toHaveProp('numberOfLines', 1);
    expect(name).toHaveProp('adjustsFontSizeToFit', true);
    expect(name).toHaveProp('ellipsizeMode', 'tail');
    expect(screen.getByTestId(`route-stars-${longest.id}`)).toHaveTextContent('★ 4/9');
  });
});
