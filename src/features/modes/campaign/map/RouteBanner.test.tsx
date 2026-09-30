import { render, screen, within } from '@testing-library/react-native';
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

    expect(within(screen.getByTestId(`route-badge-${longest.id}`)).getByText(longest.icon)).toBeOnTheScreen();
    const name = screen.getByText(longest.name);
    expect(name).toHaveProp('numberOfLines', 1);
    expect(name).toHaveProp('adjustsFontSizeToFit', true);
    expect(name).toHaveProp('ellipsizeMode', 'tail');
    expect(screen.getByTestId(`route-stars-${longest.id}`)).toHaveTextContent('★ 4/9');
  });

  it('ticks the badge of a cleared route and fades a route not reached yet', () => {
    const [route] = routes;
    const lane = routeLane(0, 392);
    const props = { route: route!, colour: '#C2553A', total: 9, left: lane.left, top: 0, width: lane.width };
    const { rerender } = render(<RouteBanner {...props} earned={3} cleared />);
    expect(screen.getByTestId(`route-cleared-${route!.id}`)).toHaveTextContent('✓');
    expect(StyleSheet.flatten(screen.getByTestId(`route-${route!.id}`).props.style).opacity).toBe(1);

    rerender(<RouteBanner {...props} earned={0} locked />);
    expect(screen.queryByTestId(`route-cleared-${route!.id}`)).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId(`route-${route!.id}`).props.style).opacity).toBe(0.75);
  });
});
